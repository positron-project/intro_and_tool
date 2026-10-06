"""
项目加入申请数据库操作。

一个函数只负责一类数据库动作，路由层只处理参数、权限和 HTTP 错误。
审核通过时，申请记录、项目成员列表和成员数量在同一个事务中提交。
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.notifications import create_notification, get_notification_by_dedupe_key
from models.project_join_requests import ProjectJoinRequest
from models.projects import Project
from models.users import User
from schemas.project_join_requests import (
    ProjectJoinRequestCreate,
    ProjectJoinRequestReview,
)


async def get_join_request_by_id(
    db: AsyncSession,
    request_id: int,
    lock: bool = False,
) -> ProjectJoinRequest | None:
    """根据申请编号查询一条申请，可选地对记录加行锁。"""

    statement = select(ProjectJoinRequest).where(
        ProjectJoinRequest.id == request_id,
    )

    if lock:
        statement = statement.with_for_update()

    result = await db.execute(statement)
    return result.scalar_one_or_none()


async def get_pending_join_request(
    db: AsyncSession,
    project_id: int,
    user_id: int,
) -> ProjectJoinRequest | None:
    """查询用户对指定项目是否已经有待处理申请。"""

    result = await db.execute(
        select(ProjectJoinRequest).where(
            ProjectJoinRequest.project_id == project_id,
            ProjectJoinRequest.user_id == user_id,
            ProjectJoinRequest.status == "pending",
        )
    )
    return result.scalar_one_or_none()


async def list_join_requests(
    db: AsyncSession,
    user_id: int | None = None,
    project_id: int | None = None,
    request_status: str | None = None,
) -> list[ProjectJoinRequest]:
    """按用户、项目和状态筛选加入申请。"""

    statement = select(ProjectJoinRequest)

    if user_id is not None:
        statement = statement.where(
            ProjectJoinRequest.user_id == user_id,
        )

    if project_id is not None:
        statement = statement.where(
            ProjectJoinRequest.project_id == project_id,
        )

    if request_status is not None:
        statement = statement.where(
            ProjectJoinRequest.status == request_status,
        )

    statement = statement.order_by(
        ProjectJoinRequest.created_at.desc(),
    )

    result = await db.execute(statement)
    return list(result.scalars().all())


async def list_join_requests_for_project_owner(
    db: AsyncSession,
    owner_id: int,
    request_status: str | None = None,
) -> list[ProjectJoinRequest]:
    """查询当前用户提交的项目收到的加入申请。"""

    statement = (
        select(ProjectJoinRequest)
        .join(Project, Project.id == ProjectJoinRequest.project_id)
        .where(Project.submitted_by == owner_id)
    )

    if request_status is not None:
        statement = statement.where(
            ProjectJoinRequest.status == request_status,
        )

    result = await db.execute(
        statement.order_by(
            ProjectJoinRequest.created_at.desc(),
            ProjectJoinRequest.id.desc(),
        )
    )
    return list(result.scalars().all())


async def create_join_request(
    db: AsyncSession,
    project: Project,
    user: User,
    data: ProjectJoinRequestCreate,
) -> ProjectJoinRequest:
    """创建一条项目加入申请。"""

    if project.review_status != "approved":
        raise ValueError("项目通过审核后才能申请加入")

    if not project.join_enabled:
        raise ValueError("这个项目暂未开放加入申请")

    member_ids = {
        str(member_id)
        for member_id in (project.member_ids or [])
    }
    if str(user.id) in member_ids:
        raise ValueError("你已经是这个项目的成员")

    # 同一个用户对同一个项目只能保留一条待处理申请。
    existing_request = await get_pending_join_request(
        db=db,
        project_id=project.id,
        user_id=user.id,
    )
    if existing_request is not None:
        return existing_request

    request = ProjectJoinRequest(
        project_id=project.id,
        user_id=user.id,
        message=data.message.strip() if data.message else None,
        status="pending",
    )
    db.add(request)
    await db.flush()

    # 申请记录和发给项目提交人的通知一起提交，避免出现“申请成功但没通知”。
    if project.submitted_by is not None and project.submitted_by != user.id:
        applicant_name = user.nickname or user.username
        request_summary = data.message.strip() if data.message else "未填写申请说明"
        await create_notification(
            db,
            user_id=project.submitted_by,
            notification_type="project_join_request",
            title=f"{applicant_name}申请加入「{project.name}」",
            content=request_summary,
            dedupe_key=f"project-join-request:{request.id}:submitted",
        )

    await db.commit()
    await db.refresh(request)
    return request


async def review_join_request(
    db: AsyncSession,
    request_id: int,
    reviewer_id: int,
    data: ProjectJoinRequestReview,
) -> ProjectJoinRequest | None:
    """
    审核加入申请。

    通过申请时，把用户编号追加到 projects.member_ids，
    并用去重后的列表长度更新 member_count。
    """

    request = await get_join_request_by_id(
        db=db,
        request_id=request_id,
        lock=True,
    )
    if request is None:
        return None

    if request.status != "pending":
        raise ValueError("这条申请已经处理过了")

    project = await db.get(Project, request.project_id)
    if project is None:
        raise ValueError("申请对应的项目不存在")

    request.status = data.status
    request.review_note = (
        data.review_note.strip()
        if data.review_note
        else None
    )
    request.reviewed_by = reviewer_id
    request.reviewed_at = datetime.now()

    if data.status == "approved":
        # JSON 字段可能同时保存数字和字符串，统一转成字符串后再去重。
        member_ids: list[str] = []
        for member_id in project.member_ids or []:
            normalized_id = str(member_id)
            if normalized_id not in member_ids:
                member_ids.append(normalized_id)

        if str(request.user_id) not in member_ids:
            member_ids.append(str(request.user_id))

        project.member_ids = member_ids
        project.member_count = len(member_ids)

    # 审核结果属于申请人；同时把提交给项目负责人的待办通知标为已读。
    if project.submitted_by is not None and project.submitted_by != request.user_id:
        request_notification = await get_notification_by_dedupe_key(
            db,
            f"project-join-request:{request.id}:submitted",
        )
        if request_notification is not None:
            request_notification.is_read = True

    project_name = project.name or "你申请的项目"
    approved = data.status == "approved"
    result_content = (
        f"你申请加入「{project_name}」的请求已通过。"
        if approved
        else f"你申请加入「{project_name}」的请求未通过。"
    )
    if request.review_note:
        result_content += f"审核说明：{request.review_note}"

    await create_notification(
        db,
        user_id=request.user_id,
        notification_type="project_join_request_result",
        title="项目加入申请已通过" if approved else "项目加入申请未通过",
        content=result_content,
        dedupe_key=f"project-join-request:{request.id}:result",
    )

    await db.commit()
    await db.refresh(request)
    return request
