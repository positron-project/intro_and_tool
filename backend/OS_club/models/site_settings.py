"""保存全站共用的主题和校园背景设置。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class SiteSettings(Base):
    """站点外观设置只保存一份，接口固定读取和更新 id=1。"""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    theme: Mapped[str] = mapped_column(
        String(10),
        default="light",
        server_default="light",
        nullable=False,
    )
    school_background_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    # 上传接口只保存图片文件；这里保存它的文件名，方便关联全局背景图。
    custom_background_asset_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
