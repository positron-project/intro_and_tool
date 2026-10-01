"""保存每个账号自己的主题、背景和动效偏好。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class UserPreferences(Base):
    """每个用户最多有一条偏好记录，主键同时也是 users.id。"""

    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    theme: Mapped[str] = mapped_column(
        String(10),
        default="light",
        server_default="light",
        nullable=False,
    )
    background_preference: Mapped[str] = mapped_column(
        String(16),
        default="follow",
        server_default="follow",
        nullable=False,
    )
    school_background_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="1",
        nullable=False,
    )
    custom_background_asset_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    custom_background_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    reduced_motion: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
