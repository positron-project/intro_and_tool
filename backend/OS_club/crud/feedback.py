"""留言建议的数据库查询和写入操作。"""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.notifications import mark_notification_event_read, notify_content_reviewers
from models.feedback import FeedbackMessage
from schemas.feedback import FeedbackCreateRequest, FeedbackUpdateRequest


FEEDBACK_ATTACHMENT_RETENTION_DAYS = 30


async def create_feedback_message(
    db: AsyncSession,
    data: FeedbackCreateRequest,
) -> FeedbackMessage:
    """保存一条新留言，并返回数据库生成的编号和时间。"""

    message = FeedbackMessage(
        category=data.category,
        content=data.content,
        contact=data.contact or None,
        attachments=[item.model_dump(by_alias=True, exclude_none=True) for item in data.attachments],
        attachments_expires_at=(datetime.utcnow() + timedelta(days=FEEDBACK_ATTACHMENT_RETENTION_DAYS)) if data.attachments else None,
        status="pending",
    )
    db.add(message)
    await db.flush()
    await notify_content_reviewers(
        db,
        notification_type="feedback_review_pending",
        title=f"留言建议待处理：{message.category}",
        content=message.content,
        dedupe_prefix=f"feedback-review:{message.id}:pending",
        roles={"Leader", "Admin"},
    )
    await db.commit()
    await db.refresh(message)
    return message


async def list_feedback_messages(
    db: AsyncSession,
    *,
    status_filter: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 100,
) -> list[FeedbackMessage]:
    """按状态和分类筛选留言，最新提交的排在前面。"""

    statement = select(FeedbackMessage)

    if status_filter is not None:
        statement = statement.where(FeedbackMessage.status == status_filter)
    if category is not None:
        statement = statement.where(FeedbackMessage.category == category)

    result = await db.execute(
        statement
        .order_by(FeedbackMessage.created_at.desc(), FeedbackMessage.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all())


async def get_feedback_message(
    db: AsyncSession,
    feedback_id: int,
) -> FeedbackMessage | None:
    """根据编号读取一条留言。"""

    return await db.get(FeedbackMessage, feedback_id)


async def update_feedback_message(
    db: AsyncSession,
    feedback_id: int,
    data: FeedbackUpdateRequest,
) -> FeedbackMessage | None:
    """更新管理员提供的处理状态或说明；未提供的字段保持不变。"""

    message = await get_feedback_message(db, feedback_id)
    if message is None:
        return None

    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return message

    for field_name, field_value in changes.items():
        setattr(message, field_name, field_value)

    if message.status != "pending":
        await mark_notification_event_read(
            db,
            f"feedback-review:{message.id}:pending:",
        )

    await db.commit()
    await db.refresh(message)
    return message


async def delete_feedback_message(
    db: AsyncSession,
    feedback_id: int,
) -> bool:
    """删除一条留言，供管理员明确执行删除操作。"""

    message = await get_feedback_message(db, feedback_id)
    if message is None:
        return False

    await db.delete(message)
    await db.commit()
    return True
