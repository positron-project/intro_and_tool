"""
 @File : members.py.py
 @Author : 加个真朋友
@Description :
"""
"""
成员目录数据库操作。
"""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.cohorts import Cohort, CohortTeam
from models.members import Member
from models.users import User
from schemas.members import (
    MemberCreateRequest,
    MemberUpdateRequest,
)


def extract_cohort_year(cohort_text: str | None) -> str | None:
    """
    从“2029”或“2029 届”中提取年份。

    例如：
    2029     -> 2029
    2029 届  -> 2029
    """

    if not cohort_text:
        return None

    year = "".join(
        character
        for character in cohort_text
        if character.isdigit()
    )

    return year or None


async def find_cohort_by_text(
    db: AsyncSession,
    cohort_text: str | None,
) -> Cohort | None:
    """根据前端传来的届次文字查询届次记录。"""

    year = extract_cohort_year(cohort_text)

    if year is None:
        return None

    result = await db.execute(
        select(Cohort).where(
            Cohort.year == year
        )
    )

    return result.scalar_one_or_none()


async def find_team_by_text(
    db: AsyncSession,
    cohort_id: int | None,
    direction: str | None,
) -> CohortTeam | None:
    """根据届次编号和小组名称查询小组。"""

    if cohort_id is None or not direction:
        return None

    direction = direction.strip()

    if direction in {"待补充", "待分配"}:
        return None

    result = await db.execute(
        select(CohortTeam).where(
            CohortTeam.cohort_id == cohort_id,
            CohortTeam.name == direction,
        )
    )

    return result.scalar_one_or_none()


async def sync_member_for_user(
    db: AsyncSession,
    user: User,
) -> Member:
    """
    根据登录账号同步一条成员目录资料。

    登录账号和成员目录是两张不同的表：
    users 保存登录、权限等账号信息，members 保存小组风采页面要展示的资料。
    用户兑换邀请码成为组员时，需要把两张表关联起来，否则前台成员页面
    查询 members 时看不到这个账号。

    这里只执行 flush，不执行 commit。
    调用方可以把邀请码使用次数、用户权限和成员资料放在同一个事务里提交。
    """

    result = await db.execute(
        select(Member).where(
            Member.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()

    # 用户昵称为空时，使用用户名作为前台展示姓名，保证 name 不为空。
    display_name = (user.nickname or user.username).strip()

    # users.role 是账号权限；members.role 是小组风采里的展示职务。
    # 新建成员时给一个合理的展示职务，后续管理员仍可以单独修改成员职务。
    display_role = {
        "Leader": "组长",
        "Admin": "组长",
        "CohortLeader": "负责人",
    }.get(user.role, "组员")

    cohort = await find_cohort_by_text(
        db,
        user.cohort,
    )
    team = await find_team_by_text(
        db,
        cohort.id if cohort else None,
        user.direction,
    )

    if member is None:
        member = Member(
            user_id=user.id,
            username=user.username,
            name=display_name,
            role=display_role,
            cohort_id=cohort.id if cohort else None,
            team_id=team.id if team else None,
            direction=(
                team.name
                if team
                else user.direction.strip()
                if user.direction
                else None
            ),
            initials=display_name[:2],
            avatar_url=user.avatar_url,
        )
        db.add(member)
    else:
        # 已经存在成员档案时更新账号关联和展示资料，避免重复创建。
        member.username = user.username
        member.name = display_name
        member.cohort_id = cohort.id if cohort else None
        member.team_id = team.id if team else None
        member.direction = (
            team.name
            if team
            else user.direction.strip()
            if user.direction
            else None
        )
        member.avatar_url = user.avatar_url

    # 让 SQLAlchemy 先把新成员的变化写入当前事务，但不结束事务。
    await db.flush()

    return member


async def list_members(
    db: AsyncSession,
    cohort_id: int | None = None,
    team_id: int | None = None,
    search: str | None = None,
) -> list[Member]:
    """查询成员列表。"""

    statement = select(Member)

    if cohort_id is not None:
        statement = statement.where(
            Member.cohort_id == cohort_id
        )

    if team_id is not None:
        statement = statement.where(
            Member.team_id == team_id
        )

    if search:
        keyword = f"%{search.strip()}%"

        statement = statement.where(
            or_(
                Member.name.like(keyword),
                Member.username.like(keyword),
                Member.direction.like(keyword),
            )
        )

    statement = statement.order_by(
        Member.id.asc()
    )

    result = await db.execute(statement)

    return list(result.scalars().all())


async def get_member_by_id(
    db: AsyncSession,
    member_id: int,
) -> Member | None:
    """根据成员编号查询成员。"""

    result = await db.execute(
        select(Member).where(
            Member.id == member_id
        )
    )

    return result.scalar_one_or_none()


async def create_member(
    db: AsyncSession,
    data: MemberCreateRequest,
) -> Member:
    """创建成员目录资料。"""

    cohort = await find_cohort_by_text(
        db,
        data.cohort,
    )

    # 用户提交了届次，但数据库中没有对应届次。
    if data.cohort not in {"", "待分配"} and cohort is None:
        raise ValueError("指定的届次不存在")

    team = await find_team_by_text(
        db,
        cohort.id if cohort else None,
        data.direction,
    )

    # 用户指定了方向，但该届次没有这个小组。
    if (
        data.direction not in {"", "待补充", "待分配"}
        and team is None
    ):
        raise ValueError("指定的小组不存在")

    member_name = data.name.strip()

    member = Member(
        username=data.username.strip()
        if data.username
        else None,
        name=member_name,
        role=data.role.strip(),
        cohort_id=cohort.id if cohort else None,
        team_id=team.id if team else None,
        direction=team.name if team else None,
        initials=(
            data.initials.strip()
            if data.initials
            else member_name[:2]
        ),
        accent=data.accent,
        avatar_url=data.avatar_url,
    )

    db.add(member)

    await db.commit()
    await db.refresh(member)

    return member


async def update_member(
    db: AsyncSession,
    member_id: int,
    data: MemberUpdateRequest,
) -> Member | None:
    """修改成员资料。"""

    member = await get_member_by_id(
        db,
        member_id,
    )

    if member is None:
        return None

    update_values = data.model_dump(
        exclude_unset=True,
        by_alias=False,
    )

    # 届次或方向发生变化时，需要重新计算两个外键。
    if "cohort" in update_values or "direction" in update_values:
        cohort_text = update_values.get(
            "cohort",
            None,
        )

        if cohort_text is None and member.cohort_id:
            cohort_result = await db.execute(
                select(Cohort).where(
                    Cohort.id == member.cohort_id
                )
            )
            cohort = cohort_result.scalar_one_or_none()
        else:
            cohort = await find_cohort_by_text(
                db,
                cohort_text,
            )

        direction = update_values.get(
            "direction",
            member.direction,
        )

        team = await find_team_by_text(
            db,
            cohort.id if cohort else None,
            direction,
        )

        if (
            direction
            and direction not in {"待补充", "待分配"}
            and team is None
        ):
            raise ValueError("指定的小组不存在")

        member.cohort_id = cohort.id if cohort else None
        member.team_id = team.id if team else None
        member.direction = team.name if team else None

        update_values.pop("cohort", None)
        update_values.pop("direction", None)

    # 修改普通字段。
    for field_name, field_value in update_values.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()

        setattr(member, field_name, field_value)

    await db.commit()
    await db.refresh(member)

    return member


async def delete_member(
    db: AsyncSession,
    member_id: int,
) -> bool:
    """删除成员目录资料。"""

    member = await get_member_by_id(
        db,
        member_id,
    )

    if member is None:
        return False

    await db.delete(member)
    await db.commit()

    return True
