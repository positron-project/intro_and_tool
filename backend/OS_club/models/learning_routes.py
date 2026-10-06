"""数据库中保存的一条学习路线。"""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class LearningRoute(Base):
    """路线的节点和精选项目以 JSON 列保存，便于和前端结构对应。"""

    __tablename__ = "learning_routes"

    # 前端使用字符串 ID，例如 pyagent；新路线由接口生成字符串 ID。
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    direction: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # 这些是路线中重复出现的子项，不需要额外拆成两张表。
    nodes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    featured_project_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    visibility: Mapped[str] = mapped_column(
        String(30),
        default="public",
        server_default="public",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
