"""保存全站共用的首页工作台展示设置。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class WorkbenchSettings(Base):
    """首页展示规则只保存一份，后续由 CRUD 固定读取和更新 id=1。"""

    __tablename__ = "workbench_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    live_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    live_title: Mapped[str] = mapped_column(
        String(200),
        default="本届正在发生",
        nullable=False,
    )
    live_subtitle: Mapped[str] = mapped_column(
        String(500),
        default="来自公告、项目和资源的最新动态",
        nullable=False,
    )
    live_items: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list, nullable=False)
    live_rotation_seconds: Mapped[float] = mapped_column(Float, default=4.2, nullable=False)

    projects_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    projects_title: Mapped[str] = mapped_column(
        String(200),
        default="当前进行的项目",
        nullable=False,
    )
    project_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    project_rotation_seconds: Mapped[float] = mapped_column(Float, default=5.2, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
