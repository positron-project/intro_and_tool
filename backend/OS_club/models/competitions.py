"""
 @File : competitions.py.py
 @Author : 加个真朋友
@Description :
"""
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base



class Competition(Base):
    """比赛中心的一场赛事，例如蓝桥杯、互联网 + 等。"""

    __tablename__ = "competitions"

    # id 是数据库内部主键，前端接收时会由 Schema 转成字符串。
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 比赛卡片上展示的主要文字。
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    type: Mapped[str] = mapped_column(String(80), nullable=False)

    # 保留 date 和 deadline 兼容旧的比赛数据；新编辑器还会写下面的细分日期。
    date: Mapped[str] = mapped_column(String(100), nullable=False)
    deadline: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    accent: Mapped[str] = mapped_column(String(30), default="blue", server_default="blue", nullable=False)
    visibility: Mapped[str] = mapped_column(String(30), default="members", server_default="members", nullable=False)

    # 赛事系列用于前端筛选，例如“蓝桥杯系列”；主办方和官网链接可不填写。
    series_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    organizer: Mapped[str | None] = mapped_column(String(150), nullable=True)
    official_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 分开保存报名和比赛的各个时间节点，前端根据这些时间计算赛事阶段。
    registration_start: Mapped[str | None] = mapped_column(String(100), nullable=True)
    registration_end: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_start: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_end: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result_date: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 每个赛道都有各自的参赛要求和报名信息；以 JSON 列保存为比赛的子数据。
    # Python 默认值确保新建 ORM 对象未传 tracks 时也会写入空列表。
    tracks: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # lifecycle 管理“草稿/发布/归档”，status 保存前端展示的赛事阶段。
    lifecycle: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        server_default="draft",
        nullable=False,
        index=True,
    )

    # 记录维护比赛的账号，账号删除时将关联设为空，不删除赛事历史。
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 数据库自动记录创建时间；updated_at 在 ORM 更新对象时刷新。
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class CompetitionProject(Base):
    """比赛详情中展示的一项往届成果。"""

    __tablename__ = "competition_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 一个比赛可以有多项成果；删除比赛时由数据库级联删除它的成果。
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    cohort: Mapped[str] = mapped_column(String(30), nullable=False)

    # cohort_id 可选关联正式届次表；届次删除后成果仍保留，只清空关联编号。
    cohort_id: Mapped[int | None] = mapped_column(
        ForeignKey("cohorts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # MySQL 不支持为 TEXT 设置普通字面量默认值；ORM 新增对象时仍会用 Python 默认值空字符串。
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # 图片 URL 用于展示，asset_id 用于指向上传服务中的图片记录。
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_asset_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    project_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # sort_order 保存管理员在编辑器中安排的展示顺序。
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class CompetitionReminder(Base):
    """保存用户是否订阅某场比赛的提醒偏好。"""

    __tablename__ = "competition_reminders"
    __table_args__ = (
        # 同一个账号对同一场比赛只能有一条提醒设置。
        UniqueConstraint("competition_id", "user_id", name="uq_competition_reminder_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(
        ForeignKey("competitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # false 表示用户取消提醒；保留该行可以让接口幂等地更新开关。
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1", nullable=False)
    # 已经发过提醒的节点记录在这里；即使用户删掉通知，定时任务也不会重新生成。
    notified_milestones: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
