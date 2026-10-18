"""项目协作成员 ID 的兼容与去重处理。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.members import Member
from models.users import User


async def normalize_project_member_ids(
    db: AsyncSession,
    member_ids: list[object] | None,
) -> list[str]:
    """把账号 ID 和成员档案 ID 转为唯一、稳定的项目成员 ID。

    有登录账号的成员使用 users.id；没有账号的成员使用 member:<id>。
    为兼容历史数据，未加前缀的数字先按账号 ID 解析，再按成员档案 ID
    解析。若旧数据中的两个 ID 数字碰撞，则账号 ID 优先。
    """

    raw_values = [str(value).strip() for value in (member_ids or [])]
    legacy_ids: set[int] = set()
    profile_ids: set[int] = set()

    for value in raw_values:
        if value.startswith("member:"):
            profile_id = value.removeprefix("member:")
            if profile_id.isdecimal():
                profile_ids.add(int(profile_id))
        elif value.isdecimal():
            legacy_ids.add(int(value))

    account_ids: set[int] = set()
    if legacy_ids:
        result = await db.execute(
            select(User.id).where(User.id.in_(legacy_ids))
        )
        account_ids = {int(user_id) for user_id in result.scalars().all()}

    profile_ids.update(legacy_ids)
    profile_users: dict[int, int | None] = {}
    if profile_ids:
        result = await db.execute(
            select(Member).where(Member.id.in_(profile_ids))
        )
        profile_users = {
            int(member.id): (
                int(member.user_id)
                if member.user_id is not None
                else None
            )
            for member in result.scalars().all()
        }

    normalized: list[str] = []
    seen: set[str] = set()

    for value in raw_values:
        if not value:
            continue

        if value.startswith("member:"):
            profile_id = value.removeprefix("member:")
            if profile_id.isdecimal():
                numeric_id = int(profile_id)
                linked_user_id = profile_users.get(numeric_id)
                canonical_id = (
                    str(linked_user_id)
                    if linked_user_id is not None
                    else f"member:{numeric_id}"
                )
            else:
                canonical_id = value
        elif value.isdecimal():
            numeric_id = int(value)
            if numeric_id in account_ids:
                canonical_id = str(numeric_id)
            elif numeric_id in profile_users:
                linked_user_id = profile_users[numeric_id]
                canonical_id = (
                    str(linked_user_id)
                    if linked_user_id is not None
                    else f"member:{numeric_id}"
                )
            else:
                # 保留数据库中无法识别的旧值，避免规范化时丢失数据。
                canonical_id = str(numeric_id)
        else:
            canonical_id = value

        if canonical_id not in seen:
            normalized.append(canonical_id)
            seen.add(canonical_id)

    return normalized
