"""定时把即将到来的比赛节点转换成持久化站内通知。"""

import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from config.db_conf import SessionLocal
from crud.notifications import create_notification, get_notification_by_dedupe_key
from models.competitions import Competition, CompetitionReminder
from models.users import User


REMINDER_LEAD_TIME = timedelta(hours=24)
CHINA_TIMEZONE = timezone(timedelta(hours=8))

# 与前端 parseCompetitionDate 支持的常见格式保持一致：
# 2026-10-12T09:30、2026/10/12、10月12日 09:30。
COMPETITION_DATE_PATTERN = re.compile(
    r"^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})(?:日)?"
    r"(?:[T\s]+(\d{1,2})(?::(\d{2}))?)?"
)

MILESTONE_FIELDS = (
    ("registration_start", "报名开始"),
    ("registration_end", "报名截止"),
    ("event_start", "比赛开始"),
    ("event_end", "比赛结束"),
    ("result_date", "结果公布"),
)


def milestone_marker(field_name: str, milestone_time: datetime) -> str:
    """记住具体节点时间；比赛改期后，新时间可以再次触发提醒。"""

    return f"{field_name}:{milestone_time.strftime('%Y-%m-%d %H:%M')}"


def notification_dedupe_key(
    competition_id: int,
    field_name: str,
    milestone_time: datetime,
    user_id: int,
) -> str:
    """同一赛事节点的不同时间分别去重。"""

    return (
        f"competition:{competition_id}:milestone:{field_name}:"
        f"{milestone_time.strftime('%Y-%m-%d-%H-%M')}:user:{user_id}"
    )


def parse_competition_datetime(
    value: str | None,
    *,
    now: datetime,
) -> datetime | None:
    """将比赛编辑器接受的日期文字解析为本地时间；无法解析时跳过该节点。"""

    if not value or not value.strip():
        return None

    match = COMPETITION_DATE_PATTERN.match(value.strip())
    if match is None:
        return None

    year_text, month_text, day_text, hour_text, minute_text = match.groups()
    try:
        return datetime(
            int(year_text) if year_text else now.year,
            int(month_text),
            int(day_text),
            int(hour_text or 0),
            int(minute_text or 0),
        )
    except ValueError:
        # 例如 2 月 30 日不是有效日期，不让一个坏字段中断整轮检查。
        return None


def get_competition_milestones(
    competition: Competition,
) -> list[tuple[str, str, str | None]]:
    """取出前端展示的五种时间节点，并兼容旧版 date/deadline 字段。"""

    values = {
        "registration_start": competition.registration_start,
        "registration_end": competition.registration_end or competition.deadline,
        "event_start": competition.event_start or competition.date,
        "event_end": competition.event_end,
        "result_date": competition.result_date,
    }
    return [
        (field_name, label, values[field_name])
        for field_name, label in MILESTONE_FIELDS
    ]


async def create_due_competition_reminders(
    *,
    now: datetime | None = None,
) -> int:
    """为已开启提醒且 24 小时内有赛程节点的用户创建通知。"""

    # 前端赛事时间没有附带时区，按中国本地时间解释，避免服务器运行在 UTC 时偏差 8 小时。
    current_time = now or datetime.now(CHINA_TIMEZONE)
    if current_time.tzinfo is not None:
        current_time = current_time.astimezone(CHINA_TIMEZONE).replace(tzinfo=None)
    created_count = 0

    async with SessionLocal() as db:
        result = await db.execute(
            select(CompetitionReminder, Competition, User)
            .join(Competition, Competition.id == CompetitionReminder.competition_id)
            .join(User, User.id == CompetitionReminder.user_id)
            .where(
                CompetitionReminder.enabled.is_(True),
                Competition.lifecycle == "published",
                User.status == "active",
            )
        )

        for reminder, competition, user in result.all():
            notified_milestones = set(reminder.notified_milestones or [])
            for field_name, label, raw_date in get_competition_milestones(competition):
                milestone_time = parse_competition_datetime(raw_date, now=current_time)
                if milestone_time is None:
                    continue

                marker = milestone_marker(field_name, milestone_time)
                # 兼容旧版只保存字段名的标记；更新赛程时 CRUD 会清除此旧标记。
                if marker in notified_milestones or field_name in notified_milestones:
                    continue

                time_until_milestone = milestone_time - current_time
                # 只提醒未来 24 小时内的节点；已经开始的节点不会补发。
                if time_until_milestone <= timedelta(0) or time_until_milestone > REMINDER_LEAD_TIME:
                    continue

                dedupe_key = notification_dedupe_key(
                    competition.id, field_name, milestone_time, user.id
                )
                legacy_dedupe_key = (
                    f"competition:{competition.id}:milestone:{field_name}:user:{user.id}"
                )
                formatted_time = milestone_time.strftime("%Y-%m-%d %H:%M")
                try:
                    existing = await get_notification_by_dedupe_key(db, dedupe_key)
                    legacy = None
                    if existing is None:
                        legacy = await get_notification_by_dedupe_key(db, legacy_dedupe_key)
                    # 已部署旧版本发过同一时间的通知时，不因去重键升级而重复发送。
                    already_notified = existing is not None or (
                        legacy is not None and formatted_time in legacy.content
                    )
                    if not already_notified:
                        await create_notification(
                            db,
                            user_id=user.id,
                            notification_type="competition_reminder",
                            title=f"比赛提醒：{competition.title}",
                            content=f"{competition.title}的“{label}”时间是 {formatted_time}，将在 24 小时内到来。",
                            link="#/events",
                            dedupe_key=dedupe_key,
                        )
                        created_count += 1

                    # 同一事务内记录已扫描节点，用户之后删除通知也不会触发重发。
                    notified_milestones.add(marker)
                    reminder.notified_milestones = sorted(notified_milestones)
                    await db.commit()
                except IntegrityError:
                    # 多个服务进程同时检查时，由数据库唯一约束裁决谁先创建。
                    await db.rollback()

    return created_count
