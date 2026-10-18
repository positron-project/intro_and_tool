"""比赛中心模块的数据库查询和写入函数。"""

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.competitions import Competition, CompetitionProject, CompetitionReminder
from schemas.competitions import (
    CompetitionCreateRequest,
    CompetitionProjectCreateRequest,
    CompetitionProjectUpdateRequest,
    CompetitionTrackData,
    CompetitionUpdateRequest,
)


async def list_competitions(
    db: AsyncSession,
    *,
    lifecycles: set[str],
    visibilities: set[str] | None,
) -> list[Competition]:
    """按允许的发布状态和可见范围查询比赛列表。"""

    statement = select(Competition).where(Competition.lifecycle.in_(lifecycles))

    # 游客或普通账号需要按访问权限过滤；组长可以传 None 查看全部范围。
    if visibilities is not None:
        statement = statement.where(Competition.visibility.in_(visibilities))

    # 按比赛开始时间排列；id 作为时间相同时稳定的第二排序条件。
    result = await db.execute(
        statement.order_by(Competition.event_start, Competition.id)
    )
    return list(result.scalars().all())


async def get_competition(db: AsyncSession, competition_id: int) -> Competition | None:
    """根据比赛主键查询一场比赛；不存在时返回 None。"""

    return await db.get(Competition, competition_id)


async def list_competition_projects(
    db: AsyncSession,
    competition_id: int,
) -> list[CompetitionProject]:
    """取出一场比赛的往届成果，并按管理员设置的顺序排列。"""

    result = await db.execute(
        select(CompetitionProject)
        .where(CompetitionProject.competition_id == competition_id)
        .order_by(CompetitionProject.sort_order, CompetitionProject.id)
    )
    return list(result.scalars().all())


async def list_projects_for_competitions(
    db: AsyncSession,
    competition_ids: list[int],
) -> dict[int, list[CompetitionProject]]:
    """一次性读取多场比赛的成果，供比赛列表组装响应使用。"""

    if not competition_ids:
        return {}

    result = await db.execute(
        select(CompetitionProject)
        .where(CompetitionProject.competition_id.in_(competition_ids))
        .order_by(CompetitionProject.competition_id, CompetitionProject.sort_order, CompetitionProject.id)
    )

    grouped_projects: dict[int, list[CompetitionProject]] = {
        competition_id: [] for competition_id in competition_ids
    }
    for project in result.scalars().all():
        grouped_projects[project.competition_id].append(project)
    return grouped_projects


def _clean_optional_text(value: str | None) -> str | None:
    """去掉可选文本两端空格，并把空字符串统一存为 NULL。"""

    if value is None:
        return None
    return value.strip() or None


def _track_to_json(track: CompetitionTrackData) -> dict[str, str]:
    """把校验后的赛道转成前端 camelCase JSON，并清理空白可选字段。"""

    values = track.model_dump(by_alias=True, exclude_none=True)
    values["id"] = values["id"].strip()
    values["name"] = values["name"].strip()
    for field_name, field_value in values.items():
        if field_name not in {"id", "name"} and isinstance(field_value, str):
            values[field_name] = field_value.strip() or None
    return {key: value for key, value in values.items() if value is not None}


async def create_competition(
    db: AsyncSession,
    data: CompetitionCreateRequest,
    creator_id: int,
) -> Competition:
    """创建一场比赛，并由服务端记录创建者和生命周期时间。"""

    # model_dump(by_alias=False) 会把前端 seriesName 等字段转回 Python 的 series_name。
    values = data.model_dump(by_alias=False)
    # JSON 子项以 camelCase 保存，读回时可直接符合前端的 CompetitionTrack 类型。
    values["tracks"] = [_track_to_json(track) for track in data.tracks]

    # 清理用户输入，避免标题或类型首尾带有多余空格。
    values["title"] = values["title"].strip()
    values["type"] = values["type"].strip() or "其他"
    values["description"] = values["description"].strip()

    # 同时保存旧版日期字段，避免旧数据读取逻辑拿到空值。
    values["date"] = (values["date"] or values["event_start"] or "").strip()
    values["deadline"] = (values["deadline"] or values["registration_end"] or "").strip()
    values["event_start"] = _clean_optional_text(values["event_start"] or values["date"])
    values["registration_end"] = _clean_optional_text(
        values["registration_end"] or values["deadline"]
    )

    # 其余可选文本的空字符串按 NULL 保存，数据库含义更清楚。
    for field_name in (
        "series_name",
        "organizer",
        "official_url",
        "registration_start",
        "event_end",
        "result_date",
    ):
        values[field_name] = _clean_optional_text(values[field_name])

    # 草稿不应显示成进行中的赛事；发布赛事若没有指定阶段，则给一个合理初始状态。
    if values["lifecycle"] == "draft":
        values["status"] = "草稿"
    elif values["status"] == "草稿":
        values["status"] = "即将开始"

    now = datetime.now()
    competition = Competition(
        **values,
        created_by=creator_id,
        updated_by=creator_id,
        published_at=now if values["lifecycle"] == "published" else None,
        archived_at=now if values["lifecycle"] == "archived" else None,
    )

    db.add(competition)
    await db.commit()
    await db.refresh(competition)
    return competition


async def update_competition(
    db: AsyncSession,
    competition: Competition,
    data: CompetitionUpdateRequest,
    updater_id: int,
) -> Competition:
    """更新比赛中实际提交的字段，并同步旧版日期字段。"""

    old_milestones = {
        "registration_start": competition.registration_start,
        "registration_end": competition.registration_end or competition.deadline,
        "event_start": competition.event_start or competition.date,
        "event_end": competition.event_end,
        "result_date": competition.result_date,
    }

    # exclude_unset=True 区分“没有提交字段”和“明确传入 null”。
    values = data.model_dump(exclude_unset=True, by_alias=False, exclude={"tracks"})
    # [] 是明确清空；未提交或显式 null 都不改动原赛道。
    if "tracks" in data.model_fields_set and data.tracks is not None:
        competition.tracks = [_track_to_json(track) for track in data.tracks]
    required_fields = {
        "title",
        "type",
        "date",
        "deadline",
        "description",
        "status",
        "accent",
        "visibility",
        "lifecycle",
    }

    for field_name, field_value in values.items():
        # 必填字段不因客户端显式传 null 而被清空。
        if field_value is None and field_name in required_fields:
            continue
        if isinstance(field_value, str):
            field_value = field_value.strip()
            if field_name in {
                "series_name",
                "organizer",
                "official_url",
                "registration_start",
                "registration_end",
                "event_start",
                "event_end",
                "result_date",
            }:
                field_value = field_value or None
        setattr(competition, field_name, field_value)

    # 前端同时发送新旧字段。若只有一套字段变化，另一套也保持一致。
    if "event_start" in values and "date" not in values:
        competition.date = values["event_start"] or ""
    elif "date" in values and "event_start" not in values:
        competition.event_start = _clean_optional_text(values["date"])
    if "registration_end" in values and "deadline" not in values:
        competition.deadline = values["registration_end"] or ""
    elif "deadline" in values and "registration_end" not in values:
        competition.registration_end = _clean_optional_text(values["deadline"])

    new_milestones = {
        "registration_start": competition.registration_start,
        "registration_end": competition.registration_end or competition.deadline,
        "event_start": competition.event_start or competition.date,
        "event_end": competition.event_end,
        "result_date": competition.result_date,
    }
    changed_milestones = {
        field_name
        for field_name, old_value in old_milestones.items()
        if _clean_optional_text(old_value)
        != _clean_optional_text(new_milestones[field_name])
    }
    if changed_milestones:
        reminders_result = await db.execute(
            select(CompetitionReminder).where(
                CompetitionReminder.competition_id == competition.id
            )
        )
        for reminder in reminders_result.scalars().all():
            # 只解除被改期节点的标记；其他节点仍保留已提醒状态。
            reminder.notified_milestones = [
                marker
                for marker in (reminder.notified_milestones or [])
                if not any(
                    marker == field_name or marker.startswith(f"{field_name}:")
                    for field_name in changed_milestones
                )
            ]

    # lifecycle 时间由服务端维护，客户端不能通过请求体指定这些时间。
    if "lifecycle" in values and values["lifecycle"] is not None:
        if competition.lifecycle == "published" and competition.published_at is None:
            competition.published_at = datetime.now()
        if competition.lifecycle == "archived":
            competition.archived_at = competition.archived_at or datetime.now()
        else:
            competition.archived_at = None
        if competition.lifecycle == "draft":
            competition.status = "草稿"
        elif competition.status == "草稿":
            competition.status = "即将开始"

    competition.updated_by = updater_id
    await db.commit()
    await db.refresh(competition)
    return competition


async def delete_competition(db: AsyncSession, competition: Competition) -> None:
    """删除赛事以及它关联的往届成果和用户提醒。"""

    # 显式删除关联记录，避免数据库外键配置差异导致删除失败。
    await db.execute(
        delete(CompetitionProject).where(
            CompetitionProject.competition_id == competition.id
        )
    )
    await db.execute(
        delete(CompetitionReminder).where(
            CompetitionReminder.competition_id == competition.id
        )
    )
    await db.delete(competition)
    await db.commit()


async def get_competition_project(
    db: AsyncSession,
    competition_id: int,
    project_id: int,
) -> CompetitionProject | None:
    """同时按比赛 ID 和成果 ID 查询，防止跨比赛修改其他成果。"""

    result = await db.execute(
        select(CompetitionProject).where(
            CompetitionProject.competition_id == competition_id,
            CompetitionProject.id == project_id,
        )
    )
    return result.scalar_one_or_none()


async def create_competition_project(
    db: AsyncSession,
    competition_id: int,
    data: CompetitionProjectCreateRequest,
) -> CompetitionProject:
    """为指定比赛新增往届成果。"""

    values = data.model_dump(by_alias=False)
    values["title"] = values["title"].strip()
    values["cohort"] = values["cohort"].strip()
    values["description"] = values["description"].strip()
    for field_name in ("image_url", "image_asset_id", "project_url"):
        values[field_name] = _clean_optional_text(values[field_name])

    project = CompetitionProject(competition_id=competition_id, **values)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_competition_project(
    db: AsyncSession,
    project: CompetitionProject,
    data: CompetitionProjectUpdateRequest,
) -> CompetitionProject:
    """局部更新一项往届成果。"""

    values = data.model_dump(exclude_unset=True, by_alias=False)
    required_fields = {"title", "cohort", "description", "sort_order"}
    optional_text_fields = {"image_url", "image_asset_id", "project_url"}

    for field_name, field_value in values.items():
        if field_value is None and field_name in required_fields:
            continue
        if isinstance(field_value, str):
            field_value = field_value.strip()
            if field_name in optional_text_fields:
                field_value = field_value or None
        setattr(project, field_name, field_value)

    await db.commit()
    await db.refresh(project)
    return project


async def delete_competition_project(
    db: AsyncSession,
    project: CompetitionProject,
) -> None:
    """删除一项往届成果。"""

    await db.delete(project)
    await db.commit()


async def get_competition_reminder(
    db: AsyncSession,
    competition_id: int,
    user_id: int,
) -> CompetitionReminder | None:
    """读取某个用户对某场比赛的提醒设置。"""

    result = await db.execute(
        select(CompetitionReminder).where(
            CompetitionReminder.competition_id == competition_id,
            CompetitionReminder.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def set_competition_reminder(
    db: AsyncSession,
    competition_id: int,
    user_id: int,
    enabled: bool,
) -> CompetitionReminder:
    """新建或更新提醒开关；同一用户重复点击会更新同一行。"""

    reminder = await get_competition_reminder(db, competition_id, user_id)
    if reminder is None:
        reminder = CompetitionReminder(
            competition_id=competition_id,
            user_id=user_id,
            enabled=enabled,
        )
        db.add(reminder)
    else:
        reminder.enabled = enabled

    await db.commit()
    await db.refresh(reminder)
    return reminder
