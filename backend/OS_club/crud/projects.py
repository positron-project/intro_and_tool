"""
 @File : projects.py.py
 @Author : 加个真朋友
@Description :
"""


"""
项目数据库操作。
"""
from datetime import datetime
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from crud.notifications import (
    create_notification,
    mark_notification_event_read,
    notify_content_reviewers,
)
from crud.project_members import normalize_project_member_ids
from models.favorites import Favorite
from models.project_join_requests import ProjectJoinRequest
from models.projects import Project
from schemas.projects import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectReviewRequest,
)
from utils.uploads import delete_upload_if_unused


async def list_projects(
    db: AsyncSession,
) -> list[Project]:
    """
    查询项目列表。

    最新修改的项目排在前面。
    """

    result = await db.execute(
        select(Project).where(
            Project.review_status == "approved"
        ).order_by(
            Project.updated_at.desc()
        )
    )

    return list(result.scalars().all())


async def list_projects_by_submitter(
    db: AsyncSession,
    submitter_id: int,
) -> list[Project]:
    """查询当前提交人自己的项目，包含所有审核状态。"""

    result = await db.execute(
        select(Project)
        .where(Project.submitted_by == submitter_id)
        .order_by(Project.updated_at.desc(), Project.id.desc())
    )
    return list(result.scalars().all())


async def list_projects_for_review(
    db: AsyncSession,
    cohort_year: int | None = None,
) -> list[Project]:
    """
    查询待审核项目。

    cohort_year 不为空时，只查询指定届次的项目。
    负责人使用这个参数限制审核范围。
    """

    statement = select(Project).where(Project.review_status == "pending")

    # 负责人只能查看自己届次的项目。
    if cohort_year is not None:
        statement = statement.where(
            Project.year == cohort_year
        )

    statement = statement.order_by(
        Project.updated_at.desc()
    )

    result = await db.execute(statement)

    return list(result.scalars().all())


async def get_project_by_id(
    db: AsyncSession,
    project_id: int,
) -> Project | None:
    """
    根据项目编号查询项目。
    """

    result = await db.execute(
        select(Project).where(
            Project.id == project_id
        )
    )

    return result.scalar_one_or_none()


async def get_project_by_slug(
    db: AsyncSession,
    slug: str,
) -> Project | None:
    """
    根据项目地址标识查询项目。

    例如：
    /projects/ai-campus
    slug 就是 ai-campus。
    """

    result = await db.execute(
        select(Project).where(
            Project.slug == slug,
            Project.review_status == "approved",
        )
    )

    return result.scalar_one_or_none()


async def increase_project_views(
    db: AsyncSession,
    project_id: int,
) -> Project | None:
    """
    增加项目浏览量。

    每次项目详情页被有效打开时，浏览量增加 1。
    """

    # 先查询项目。
    project = await get_project_by_id(
        db,
        project_id,
    )

    # 项目不存在时返回 None。
    if project is None:
        return None

    # 浏览量增加 1。
    project.views += 1

    # 保存修改。
    await db.commit()

    # 重新读取数据库中的最新浏览量。
    await db.refresh(project)

    return project


async def create_project(
    db: AsyncSession,
    data: ProjectCreateRequest,
    submitted_by: int,
) -> Project:
    """
    创建项目。

    submitted_by 表示提交项目的用户 ID。
    新项目默认进入待审核状态。
    """

    # 把请求模型转换成数据库字段字典。
    project_values = data.model_dump(
        by_alias=False,
    )
    project_values["member_ids"] = await normalize_project_member_ids(
        db,
        project_values.get("member_ids"),
    )
    project_values["member_count"] = len(project_values["member_ids"])

    project = Project(
        **project_values,

        # 记录是谁提交的项目。
        submitted_by=submitted_by,

        # 所有新提交的项目都必须先审核。
        review_status="pending",
    )

    db.add(project)

    # 先 flush 以取得项目编号，再为该项目创建审核待办通知。
    await db.flush()
    await notify_content_reviewers(
        db,
        notification_type="project_review_pending",
        title=f"项目投稿待审核：{project.name}",
        content=project.description,
        dedupe_prefix=f"project-review:{project.id}:pending",
        cohort=str(project.year),
        exclude_user_id=submitted_by,
    )

    # 把项目写入数据库。
    await db.commit()

    # 读取数据库自动生成的 id 和时间。
    await db.refresh(project)

    return project


async def update_project(
    db: AsyncSession,
    project_id: int,
    data: ProjectUpdateRequest,
    resubmit: bool = False,
) -> Project | None:
    """
    修改项目。

    只修改请求中真正提交的字段。
    """

    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        return None

    # 保存旧图片地址；数据库更新提交后再判断它们是否已无人使用。
    old_uploads = [
        project.cover_image,
        *(project.gallery_images or []),
        project.download_url,
    ]

    update_values = data.model_dump(
        exclude_unset=True,
        by_alias=False,
    )

    if "member_ids" in update_values:
        update_values["member_ids"] = await normalize_project_member_ids(
            db,
            update_values["member_ids"],
        )
        update_values["member_count"] = len(update_values["member_ids"])

    # 把提交的字段逐个写入数据库对象。
    for field_name, field_value in update_values.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()

        setattr(project, field_name, field_value)

    if resubmit:
        project.review_status = "pending"
        project.review_note = None
        project.reviewed_by = None
        project.reviewed_at = None

        # 新一轮审核使用新的通知编号，避免被上一次审核的通知去重。
        await mark_notification_event_read(
            db,
            f"project-review:{project.id}:pending:",
        )
        await notify_content_reviewers(
            db,
            notification_type="project_review_pending",
            title=f"项目投稿重新提交：{project.name}",
            content=project.description,
            dedupe_prefix=(
                f"project-review:{project.id}:pending:"
                f"{datetime.now().isoformat()}"
            ),
            cohort=str(project.year),
            exclude_user_id=project.submitted_by,
        )

    await db.commit()
    await db.refresh(project)

    for old_upload in old_uploads:
        await delete_upload_if_unused(db, old_upload)

    return project


async def review_project(
    db: AsyncSession,
    project_id: int,
    reviewer_id: int,
    reviewer_name: str,
    data: ProjectReviewRequest,
) -> Project | None:
    """
    审核项目。

    reviewer_id 表示执行审核操作的用户 ID。
    审核结果只能是 approved 或 rejected。
    """

    # 先根据项目编号查询项目。
    project = await get_project_by_id(
        db,
        project_id,
    )

    # 如果项目不存在，返回 None。
    if project is None:
        return None

    # 保存审核结果。
    project.review_status = data.review_status

    # 保存审核意见。
    # 如果没有填写意见，就保存为 None。
    project.review_note = (
        data.review_note.strip()
        if data.review_note
        else None
    )

    # 记录是谁审核的。
    project.reviewed_by = reviewer_id

    # 记录审核时间。
    project.reviewed_at = datetime.now()

    # 该项目不再是待办；通知标为已读，但仍留在收件箱供审核人自行清理。
    await mark_notification_event_read(
        db,
        f"project-review:{project.id}:pending:",
    )

    # 给投稿人创建审核结果通知；该函数只 flush，不会提前提交事务。
    if project.submitted_by is not None:
        approved = project.review_status == "approved"
        title = "项目审核已通过" if approved else "项目审核未通过"
        content = (
            f"你的项目「{project.name}」已通过审核，现已进入项目库。"
            if approved
            else f"你的项目「{project.name}」已被退回。"
        )
        if project.review_note:
            content += f"审核意见：{project.review_note}"

        await create_notification(
            db,
            user_id=project.submitted_by,
            notification_type="project_review_result",
            title=title,
            content=content,
            # 详情查询只公开已通过的项目；退回项目不能跳到一个不存在的页面。
            link=f"#/projects/{project.slug}" if approved else None,
            dedupe_key=f"project-review-result:{project.id}:{project.reviewed_at.isoformat()}",
        )

    review_actions = {
        "approved": "项目审核通过",
        "rejected": "项目审核退回",
    }
    record_audit_log(
        db,
        actor_id=reviewer_id,
        actor_name=reviewer_name,
        action=review_actions[project.review_status],
        resource_type="project",
        resource_id=str(project.id),
        target=project.name,
    )

    # 审核状态和通知在同一次提交中保存，避免只成功一半。
    await db.commit()

    # 重新读取数据库中的最新数据。
    await db.refresh(project)

    return project


async def delete_project(
    db: AsyncSession,
    project_id: int,
) -> bool:
    """
    删除项目。

    当前先使用物理删除。
    以后项目数据重要后，可以改成软删除。
    """

    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        return False

    old_uploads = [
        project.cover_image,
        *(project.gallery_images or []),
        project.download_url,
    ]

    # 先删除依赖项目的申请和收藏关系，避免外键阻止项目删除。
    await db.execute(
        delete(ProjectJoinRequest).where(
            ProjectJoinRequest.project_id == project_id,
        )
    )
    await db.execute(
        delete(Favorite).where(
            Favorite.target_type == "project",
            Favorite.target_id == str(project_id),
        )
    )

    await db.delete(project)
    await db.commit()

    for old_upload in old_uploads:
        await delete_upload_if_unused(db, old_upload)

    return True
