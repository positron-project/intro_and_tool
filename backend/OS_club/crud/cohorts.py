"""
 @File : cohorts.py.py
 @Author : 加个真朋友
@Description :
"""
"""
届次和小组的数据库操作。
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.cohorts import Cohort, CohortTeam
from models.members import Member
from models.users import User
from schemas.cohorts import (
    CohortCreateRequest,
    CohortUpdateRequest,
    CohortTeamCreateRequest,
    CohortTeamUpdateRequest,
)


# 每个新届次都会自动建立这三个基础小组。
# member_capacity 不预设人数上限，由管理员之后按实际情况填写。
DEFAULT_COHORT_TEAMS = (
    {
        "name": "算法组",
        "description": "用算法、模型与实验，把问题拆成可验证的答案。",
        "accent": "violet",
    },
    {
        "name": "项目组",
        "description": "把想法推到真实场景，负责协作、交付和持续迭代。",
        "accent": "blue",
    },
    {
        "name": "网安组",
        "description": "关注安全研究、攻防实践与系统风险防护。",
        "accent": "rose",
    },
)


async def list_cohorts(db: AsyncSession) -> list[Cohort]:
    """查询全部届次，年份较新的排在前面。"""

    result = await db.execute(
        select(Cohort).order_by(Cohort.year.desc())
    )

    return list(result.scalars().all())


async def get_cohort_by_id(
    db: AsyncSession,
    cohort_id: int,
) -> Cohort | None:
    """根据届次编号查询届次。"""

    result = await db.execute(
        select(Cohort).where(Cohort.id == cohort_id)
    )

    return result.scalar_one_or_none()


async def get_cohort_by_year(
    db: AsyncSession,
    year: str,
) -> Cohort | None:
    """根据届次年份查询届次。"""

    result = await db.execute(
        select(Cohort).where(Cohort.year == year)
    )

    return result.scalar_one_or_none()


async def cohort_has_members(
    db: AsyncSession,
    cohort_id: int,
) -> bool:
    """检查届次下是否还有成员档案或所属账号。"""

    cohort = await get_cohort_by_id(db, cohort_id)

    if cohort is None:
        return False

    member_result = await db.execute(
        select(Member.id)
        .where(Member.cohort_id == cohort_id)
        .limit(1)
    )

    if member_result.scalar_one_or_none() is not None:
        return True

    # 普通成员账号可能尚未建立前台成员档案，所以也检查账号里保存的届次文字。
    user_result = await db.execute(
        select(User.cohort).where(User.cohort.is_not(None))
    )

    for user_cohort in user_result.scalars().all():
        user_cohort_year = "".join(
            character
            for character in (user_cohort or "")
            if character.isdigit()
        )
        if user_cohort_year == cohort.year:
            return True

    return False


async def create_cohort(
    db: AsyncSession,
    data: CohortCreateRequest,
) -> Cohort:
    """创建一个届次。"""

    cohort = Cohort(
        year=data.year.strip(),
        generation_label=data.generation_label.strip(),
        status=data.status,
        description=data.description.strip(),
    )

    db.add(cohort)

    # flush 会先把届次写入当前事务，让数据库生成届次 id；这里还没有 commit。
    await db.flush()

    # 新届次的三个小组和届次一起保存，保证其他访客读取时拿到完整数据。
    for team_data in DEFAULT_COHORT_TEAMS:
        db.add(
            CohortTeam(
                cohort_id=cohort.id,
                **team_data,
            )
        )

    # 一次 commit 同时保存届次和小组，任一步失败都不会只留下半套数据。
    await db.commit()

    # 获取数据库自动生成的 id 和时间。
    await db.refresh(cohort)

    return cohort


async def update_cohort(
    db: AsyncSession,
    cohort_id: int,
    data: CohortUpdateRequest,
) -> Cohort | None:
    """修改一个届次。"""

    cohort = await get_cohort_by_id(db, cohort_id)

    if cohort is None:
        return None

    # exclude_unset=True 只获取前端实际提交的字段。
    update_data = data.model_dump(
        exclude_unset=True,
        by_alias=False,
    )

    for field_name, field_value in update_data.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()

        setattr(cohort, field_name, field_value)

    await db.commit()
    await db.refresh(cohort)

    return cohort


async def delete_cohort(
    db: AsyncSession,
    cohort_id: int,
) -> bool:
    """删除届次及其下面的小组。"""

    cohort = await get_cohort_by_id(db, cohort_id)

    if cohort is None:
        return False

    team_result = await db.execute(
        select(CohortTeam).where(
            CohortTeam.cohort_id == cohort_id
        )
    )

    teams = team_result.scalars().all()

    # 先删除小组，再删除届次，避免外键约束报错。
    for team in teams:
        await db.delete(team)

    # delete() 只是把删除加入当前事务；flush() 会先把小组删除发送给数据库。
    # 这样数据库删除届次时，就不会再看到仍然引用它的小组记录。
    await db.flush()

    await db.delete(cohort)
    await db.commit()

    return True


async def list_teams(
    db: AsyncSession,
    cohort_id: int,
) -> list[CohortTeam]:
    """查询某个届次下面的全部小组。"""

    result = await db.execute(
        select(CohortTeam)
        .where(CohortTeam.cohort_id == cohort_id)
        .order_by(CohortTeam.id.asc())
    )

    return list(result.scalars().all())


async def get_team_by_id(
    db: AsyncSession,
    cohort_id: int,
    team_id: int,
) -> CohortTeam | None:
    """根据届次编号和小组编号查询小组。"""

    result = await db.execute(
        select(CohortTeam).where(
            CohortTeam.id == team_id,
            CohortTeam.cohort_id == cohort_id,
        )
    )

    return result.scalar_one_or_none()


async def create_team(
    db: AsyncSession,
    cohort_id: int,
    data: CohortTeamCreateRequest,
) -> CohortTeam:
    """在指定届次下面创建小组。"""

    team = CohortTeam(
        cohort_id=cohort_id,
        name=data.name.strip(),
        description=data.description.strip(),
        accent=data.accent,
        member_capacity=data.member_capacity,
    )

    db.add(team)
    await db.commit()
    await db.refresh(team)

    return team


async def update_team(
    db: AsyncSession,
    cohort_id: int,
    team_id: int,
    data: CohortTeamUpdateRequest,
) -> CohortTeam | None:
    """修改指定届次下面的小组。"""

    team = await get_team_by_id(
        db,
        cohort_id,
        team_id,
    )

    if team is None:
        return None

    update_data = data.model_dump(
        exclude_unset=True,
        by_alias=False,
    )

    for field_name, field_value in update_data.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()

        setattr(team, field_name, field_value)

    await db.commit()
    await db.refresh(team)

    return team


async def delete_team(
    db: AsyncSession,
    cohort_id: int,
    team_id: int,
) -> bool:
    """删除指定届次下面的小组。"""

    team = await get_team_by_id(
        db,
        cohort_id,
        team_id,
    )

    if team is None:
        return False

    await db.delete(team)
    await db.commit()

    return True
