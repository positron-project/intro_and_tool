"""站内通知的数据库查询和写入函数。"""

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.feedback import FeedbackMessage
from models.interviews import Interview
from models.notifications import Notification
from models.projects import Project
from models.project_join_requests import ProjectJoinRequest
from models.resource_submissions import ResourceSubmission
from models.users import User


REVIEWER_ROLES = {"CohortLeader", "Leader", "Admin"}
ACTIONABLE_NOTIFICATION_TYPES = {
    "project_join_request",
    "project_review_pending",
    "resource_submission_pending",
    "interview_submission_pending",
    "feedback_review_pending",
}


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    content: str,
    link: str | None = None,
    dedupe_key: str | None = None,
) -> Notification:
    """在当前数据库事务中新增通知，由调用方决定何时提交。"""

    if dedupe_key:
        existing = await get_notification_by_dedupe_key(db, dedupe_key)
        if existing is not None:
            return existing

    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        content=content,
        link=link,
        dedupe_key=dedupe_key,
    )
    db.add(notification)
    # flush 会把 INSERT 发给数据库并取得 id，但不提交事务。
    await db.flush()
    return notification


async def notify_content_reviewers(
    db: AsyncSession,
    *,
    notification_type: str,
    title: str,
    content: str,
    dedupe_prefix: str,
    link: str = "#/admin",
    cohort: str | None = None,
    exclude_user_id: int | None = None,
    roles: set[str] | None = None,
) -> int:
    """给有权处理这类内容的在职审核人分别创建一条收件箱通知。

    传入届次时只通知对应届次负责人和全局组长；传入空字符串时只通知全局组长；
    不传届次时通知所有审核人。
    """

    reviewer_roles = roles or REVIEWER_ROLES
    result = await db.execute(
        select(User).where(
            User.status == "active",
            User.role.in_(reviewer_roles),
        )
    )
    reviewers = result.scalars().all()
    target_cohort = "".join(character for character in (cohort or "") if character.isdigit())
    created_count = 0

    for reviewer in reviewers:
        if exclude_user_id is not None and reviewer.id == exclude_user_id:
            continue
        if reviewer.role == "CohortLeader" and cohort is not None:
            reviewer_cohort = "".join(character for character in (reviewer.cohort or "") if character.isdigit())
            if not target_cohort or reviewer_cohort != target_cohort:
                continue

        dedupe_key = f"{dedupe_prefix}:user:{reviewer.id}"
        if await get_notification_by_dedupe_key(db, dedupe_key) is not None:
            continue

        await create_notification(
            db,
            user_id=reviewer.id,
            notification_type=notification_type,
            title=title,
            content=content,
            link=link,
            dedupe_key=dedupe_key,
        )
        created_count += 1

    return created_count


async def mark_notification_event_read(
    db: AsyncSession,
    dedupe_prefix: str,
) -> int:
    """将某个业务事件发出的所有待办通知标为已读，不提交外层事务。"""

    result = await db.execute(
        update(Notification)
        .where(
            Notification.dedupe_key.like(f"{dedupe_prefix}%"),
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    return int(result.rowcount or 0)


def _notification_pending_reference(notification: Notification) -> tuple[str, int] | None:
    """从待办去重键中取出业务记录类型和编号。"""

    if notification.type not in ACTIONABLE_NOTIFICATION_TYPES:
        return None
    if not notification.dedupe_key:
        return ("unknown", notification.id)

    parts = notification.dedupe_key.split(":")
    expected_prefix = {
        "project_join_request": "project-join-request",
        "project_review_pending": "project-review",
        "resource_submission_pending": "resource-submission",
        "interview_submission_pending": "interview-submission",
        "feedback_review_pending": "feedback-review",
    }[notification.type]
    if len(parts) < 3 or parts[0] != expected_prefix:
        return ("unknown", notification.id)
    try:
        return (notification.type, int(parts[1]))
    except ValueError:
        return ("unknown", notification.id)


async def active_pending_notification_ids(
    db: AsyncSession,
    notifications: list[Notification],
) -> set[int]:
    """查出仍对应待处理业务的通知，保证读过也不能把待办删掉。"""

    references: dict[str, dict[int, list[int]]] = {}
    protected_ids: set[int] = set()
    for notification in notifications:
        reference = _notification_pending_reference(notification)
        if reference is None:
            continue
        entity_type, entity_id = reference
        if entity_type == "unknown":
            protected_ids.add(notification.id)
            continue
        references.setdefault(entity_type, {}).setdefault(entity_id, []).append(notification.id)

    checks = (
        ("project_join_request", ProjectJoinRequest, ProjectJoinRequest.status),
        ("project_review_pending", Project, Project.review_status),
        ("resource_submission_pending", ResourceSubmission, ResourceSubmission.status),
        ("interview_submission_pending", Interview, Interview.status),
        ("feedback_review_pending", FeedbackMessage, FeedbackMessage.status),
    )
    for entity_type, model, status_column in checks:
        entity_to_notification_ids = references.get(entity_type)
        if not entity_to_notification_ids:
            continue
        active_result = await db.execute(
            select(model.id).where(
                model.id.in_(entity_to_notification_ids),
                status_column == "pending",
            )
        )
        for entity_id in active_result.scalars().all():
            protected_ids.update(entity_to_notification_ids[int(entity_id)])

    return protected_ids


async def get_notification_by_dedupe_key(
    db: AsyncSession,
    dedupe_key: str,
) -> Notification | None:
    """检查某个业务事件是否已经生成过通知。"""

    result = await db.execute(
        select(Notification).where(Notification.dedupe_key == dedupe_key)
    )
    return result.scalar_one_or_none()


async def list_user_notifications(
    db: AsyncSession,
    *,
    user_id: int,
    page: int,
    page_size: int,
    unread_only: bool,
) -> tuple[list[Notification], int]:
    """只读取当前用户的通知，并按最新创建时间分页。"""

    filters = [Notification.user_id == user_id]
    if unread_only:
        filters.append(Notification.is_read.is_(False))

    total_result = await db.execute(
        select(func.count(Notification.id)).where(*filters)
    )
    total = int(total_result.scalar_one() or 0)

    result = await db.execute(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def count_user_unread_notifications(
    db: AsyncSession,
    user_id: int,
) -> int:
    """统计当前用户的未读通知。"""

    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return int(result.scalar_one() or 0)


async def get_user_notification(
    db: AsyncSession,
    *,
    notification_id: int,
    user_id: int,
) -> Notification | None:
    """按通知编号和用户编号查找，避免访问其他人的通知。"""

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def mark_user_notification_read(
    db: AsyncSession,
    *,
    notification_id: int,
    user_id: int,
) -> Notification | None:
    """将当前用户的一条通知标记为已读；重复调用不会产生副作用。"""

    notification = await get_user_notification(
        db,
        notification_id=notification_id,
        user_id=user_id,
    )
    if notification is None:
        return None

    if not notification.is_read:
        notification.is_read = True
        await db.commit()
        await db.refresh(notification)

    return notification


async def mark_all_user_notifications_read(
    db: AsyncSession,
    user_id: int,
) -> int:
    """将当前用户所有未读通知设为已读，并返回更新数量。"""

    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()
    return int(result.rowcount or 0)


async def delete_user_notification(
    db: AsyncSession,
    *,
    notification_id: int,
    user_id: int,
) -> bool:
    """删除当前用户自己的通知；其他用户的通知不会被命中。"""

    notification = await get_user_notification(
        db,
        notification_id=notification_id,
        user_id=user_id,
    )
    if notification is None:
        return False

    if not notification.is_read:
        raise ValueError("请先阅读通知后再删除")

    if notification.id in await active_pending_notification_ids(db, [notification]):
        raise ValueError("对应事项仍在待处理状态，完成处理后才能删除这条通知")

    await db.delete(notification)
    await db.commit()
    return True


async def delete_read_user_notifications(db: AsyncSession, user_id: int) -> int:
    """批量删除当前用户已读且不再对应待处理事项的通知。"""

    deleted_count = 0
    last_notification_id = 0
    batch_size = 500
    while True:
        result = await db.execute(
            select(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(True),
                Notification.id > last_notification_id,
            )
            .order_by(Notification.id.asc())
            .limit(batch_size)
        )
        candidates = list(result.scalars().all())
        if not candidates:
            break

        last_notification_id = candidates[-1].id
        protected_ids = await active_pending_notification_ids(db, candidates)
        deletable_ids = [
            notification.id
            for notification in candidates
            if notification.id not in protected_ids
        ]
        if deletable_ids:
            delete_result = await db.execute(
                delete(Notification).where(
                    Notification.user_id == user_id,
                    Notification.is_read.is_(True),
                    Notification.id.in_(deletable_ids),
                )
            )
            deleted_count += int(delete_result.rowcount or 0)

    await db.commit()
    return deleted_count
