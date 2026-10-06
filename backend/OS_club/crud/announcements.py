"""公告的数据库查询、新增、修改和删除操作。"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from models.announcements import Announcement
from models.users import User
from schemas.announcements import AnnouncementCreateRequest, AnnouncementUpdateRequest


PUBLIC_SCOPE = "全站公开"
ADMIN_SCOPE = "管理员可见"


def get_cohort_announcement_scope(cohort: str | None) -> str | None:
    """把账号届次转换成公告可见范围，例如“2029 届可见”。"""

    cohort_year = "".join(character for character in (cohort or "") if character.isdigit())
    if not cohort_year:
        return None
    return f"{cohort_year} 届可见"


async def list_announcements(
    db: AsyncSession,
    current_user: User | None,
) -> list[Announcement]:
    """按当前访问者的身份，只返回可以看到的公告。"""

    statement = select(Announcement)

    if current_user is None:
        # 游客只能看到已经发布的全站公告。
        statement = statement.where(
            Announcement.published.is_(True),
            Announcement.scope == PUBLIC_SCOPE,
        )
    elif current_user.role in {"Leader", "Admin"}:
        # 组长可以查看所有公告，包括草稿。
        pass
    elif current_user.role == "CohortLeader":
        # 有管理后台的负责人可以查看完整公告列表；修改和删除仍按届次权限校验。
        pass
    else:
        # 普通用户只能看到已发布的全站公告和自己届次的公告。
        cohort_scope = get_cohort_announcement_scope(current_user.cohort)
        visible_scopes = [PUBLIC_SCOPE]
        if cohort_scope:
            visible_scopes.append(cohort_scope)
        statement = statement.where(
            Announcement.published.is_(True),
            Announcement.scope.in_(visible_scopes),
        )

    result = await db.execute(
        statement.order_by(Announcement.created_at.desc(), Announcement.id.desc())
    )
    return list(result.scalars().all())


async def get_announcement(
    db: AsyncSession,
    announcement_id: int,
) -> Announcement | None:
    """按编号查找一条公告。"""

    return await db.get(Announcement, announcement_id)


async def create_announcement(
    db: AsyncSession,
    data: AnnouncementCreateRequest,
    user: User,
) -> Announcement:
    """保存一条新公告，并记录创建者和首次发布时间。"""

    now = datetime.now()
    announcement = Announcement(
        category=data.category,
        title=data.title.strip(),
        detail=data.detail.strip(),
        date=data.date.strip(),
        scope=data.scope,
        published=data.published,
        created_by=user.id,
        updated_by=user.id,
        published_at=now if data.published else None,
    )
    db.add(announcement)
    await db.flush()
    record_audit_log(
        db,
        actor_id=user.id,
        actor_name=user.nickname or user.username,
        action="发布公告" if data.published else "保存公告草稿",
        resource_type="announcement",
        resource_id=str(announcement.id),
        target=announcement.title,
    )
    await db.commit()
    await db.refresh(announcement)
    return announcement


async def update_announcement(
    db: AsyncSession,
    announcement: Announcement,
    data: AnnouncementUpdateRequest,
    user: User,
) -> Announcement:
    """只修改请求中提供的字段，并更新最后修改人。"""

    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    was_published = announcement.published

    for field_name, field_value in changes.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()
        setattr(announcement, field_name, field_value)

    if "published" in changes:
        if announcement.published and not was_published:
            announcement.published_at = datetime.now()
        elif not announcement.published:
            announcement.published_at = None

    announcement.updated_by = user.id
    if "published" in changes and announcement.published != was_published:
        action = "发布公告" if announcement.published else "撤回公告"
    elif announcement.published:
        action = "编辑公告"
    else:
        action = "编辑公告草稿"

    record_audit_log(
        db,
        actor_id=user.id,
        actor_name=user.nickname or user.username,
        action=action,
        resource_type="announcement",
        resource_id=str(announcement.id),
        target=announcement.title,
    )
    await db.commit()
    await db.refresh(announcement)
    return announcement


async def delete_announcement(
    db: AsyncSession,
    announcement: Announcement,
    user: User,
) -> None:
    """删除一条公告记录。"""

    record_audit_log(
        db,
        actor_id=user.id,
        actor_name=user.nickname or user.username,
        action="删除公告",
        resource_type="announcement",
        resource_id=str(announcement.id),
        target=announcement.title,
    )
    await db.delete(announcement)
    await db.commit()
