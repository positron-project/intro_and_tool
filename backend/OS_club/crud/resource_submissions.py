"""
 @File : resource_submissions.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源投稿数据库操作。

投稿记录先保存在 resource_submissions 表中，
审核逻辑由 router 调用这些 CRUD 函数完成。
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from crud.notifications import (
    create_notification,
    mark_notification_event_read,
    notify_content_reviewers,
)
from models.resource_submissions import ResourceSubmission
from models.users import User
from schemas.resource_submissions import (
    ResourceSubmissionCreateRequest,
    ResourceSubmissionReviewRequest,
)


async def list_resource_submissions(
    db: AsyncSession,
    submitter_id: int | None = None,
    submission_status: str | None = None,
) -> list[ResourceSubmission]:
    """
    查询资源投稿列表。

    submitter_id 不为空时，只查询某个用户自己的投稿。
    submission_status 不为空时，只查询指定状态的投稿。
    """

    statement = select(ResourceSubmission)

    if submitter_id is not None:
        statement = statement.where(
            ResourceSubmission.submitter_id == submitter_id,
        )

    if submission_status is not None:
        statement = statement.where(
            ResourceSubmission.status == submission_status,
        )

    statement = statement.order_by(
        ResourceSubmission.created_at.desc(),
    )

    result = await db.execute(statement)

    return list(result.scalars().all())


async def get_resource_submission_by_id(
    db: AsyncSession,
    submission_id: int,
) -> ResourceSubmission | None:
    """
    根据投稿编号查询一条投稿记录。
    """

    return await db.get(
        ResourceSubmission,
        submission_id,
    )


async def create_resource_submission(
    db: AsyncSession,
    data: ResourceSubmissionCreateRequest,
    submitter_id: int,
) -> ResourceSubmission:
    """
    创建一条资源投稿。

    新投稿默认状态是 pending，
    表示等待管理员审核。
    """

    submission_values = data.model_dump(
        by_alias=False,
        mode="json",
    )

    # 前端传过来的编号是字符串，
    # 数据库外键字段需要整数。
    target_resource_id = submission_values.get(
        "target_resource_id",
    )

    if target_resource_id is not None:
        submission_values["target_resource_id"] = int(
            target_resource_id,
        )

    submission = ResourceSubmission(
        **submission_values,
        submitter_id=submitter_id,
        status="pending",
    )

    db.add(submission)

    submitter = await db.get(User, submitter_id)

    # 投稿记录先取得编号，再和审核待办通知一起提交。
    await db.flush()
    await notify_content_reviewers(
        db,
        notification_type="resource_submission_pending",
        title=f"资源投稿待审核：{submission.title}",
        content=submission.description,
        dedupe_prefix=f"resource-submission:{submission.id}:pending:{submission.version}",
        # 届次负责人只接收本届投稿；未分配届次时通知全局组长。
        cohort=(submitter.cohort or "") if submitter is not None else "",
        exclude_user_id=submitter_id,
    )

    await db.commit()
    await db.refresh(submission)

    return submission


async def review_resource_submission(
    db: AsyncSession,
    submission_id: int,
    reviewer_id: int,
    reviewer_name: str,
    data: ResourceSubmissionReviewRequest,
) -> ResourceSubmission | None:
    """
    修改投稿审核状态。

    action 和数据库状态的对应关系：

    approve          -> approved
    reject           -> rejected
    request_changes  -> changes_requested
    """

    submission = await get_resource_submission_by_id(
        db=db,
        submission_id=submission_id,
    )

    if submission is None:
        return None

    status_mapping = {
        "approve": "approved",
        "reject": "rejected",
        "request_changes": "changes_requested",
    }

    submission.status = status_mapping[data.action]

    submission.review_note = (
        data.review_note.strip()
        if data.review_note
        else None
    )

    submission.reviewed_by = reviewer_id
    submission.reviewed_at = datetime.now()

    # 完成审核后，收件人的待办通知变为已读；业务记录仍保存在投稿表。
    await mark_notification_event_read(
        db,
        f"resource-submission:{submission.id}:pending:",
    )
    result_title = {
        "approved": "资源投稿已通过",
        "rejected": "资源投稿未通过",
        "changes_requested": "资源投稿需要修改",
    }[submission.status]
    result_content = f"你的资源投稿「{submission.title}」审核结果：{result_title}。"
    if submission.review_note:
        result_content += f"审核说明：{submission.review_note}"
    await create_notification(
        db,
        user_id=submission.submitter_id,
        notification_type="resource_submission_result",
        title=f"{result_title}：{submission.title}",
        content=result_content,
        link="#/messages",
        dedupe_key=f"resource-submission:{submission.id}:result:{submission.reviewed_at.isoformat()}",
    )

    review_actions = {
        "approve": "资源投稿审核通过",
        "reject": "资源投稿未通过",
        "request_changes": "要求修改资源投稿",
    }
    record_audit_log(
        db,
        actor_id=reviewer_id,
        actor_name=reviewer_name,
        action=review_actions[data.action],
        resource_type="resource_submission",
        resource_id=str(submission.id),
        target=submission.title,
    )

    await db.commit()
    await db.refresh(submission)

    return submission


async def withdraw_resource_submission(
    db: AsyncSession,
    submission_id: int,
    submitter_id: int,
) -> ResourceSubmission | None:
    """
    投稿人撤回自己的投稿。

    这里只能撤回自己的投稿，
    不能撤回其他用户的投稿。
    """

    submission = await get_resource_submission_by_id(
        db=db,
        submission_id=submission_id,
    )

    if submission is None:
        return None

    if submission.submitter_id != submitter_id:
        return None

    # 已经审核通过的投稿不能再撤回。
    if submission.status == "approved":
        return None

    submission.status = "withdrawn"

    await db.commit()
    await db.refresh(submission)

    return submission
