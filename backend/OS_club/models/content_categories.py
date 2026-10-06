"""项目、资源和面经分类数据库模型。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class ContentCategory(Base):
    """内容分类配置；resource 区分项目、资源和面经三套分类。"""

    __tablename__ = "content_categories"
    __table_args__ = (
        UniqueConstraint(
            "resource",
            "category_key",
            name="uq_content_category_resource_key",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    resource: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    category_key: Mapped[str] = mapped_column(
        "category_key",
        String(50),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    accent: Mapped[str] = mapped_column(
        String(20),
        default="blue",
        server_default="blue",
        nullable=False,
    )

    icon: Mapped[str] = mapped_column(
        String(50),
        default="folder",
        server_default="folder",
        nullable=False,
    )

    sort_order: Mapped[int] = mapped_column(
        "sort_order",
        default=0,
        server_default="0",
        nullable=False,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="1",
        nullable=False,
    )

    built_in: Mapped[bool] = mapped_column(
        "built_in",
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
