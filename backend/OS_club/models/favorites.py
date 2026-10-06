"""
内容收藏数据库模型。

项目收藏是当前项目模块的主要使用场景，target_type/target_id 设计成通用
字段，后续资源和面经接入时无需再次修改表结构。
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Favorite(Base):
    """一条用户对一项内容的收藏记录。"""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "target_type",
            "target_id",
            name="uq_favorite_user_target",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    target_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    target_id: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
