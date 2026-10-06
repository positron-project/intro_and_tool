"""Prompt 模板以及它的投稿审核状态。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class PromptTemplate(Base):
    """一条记录既可以是待审核投稿，也可以是已发布模板。"""

    __tablename__ = "prompt_templates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    usage: Mapped[str] = mapped_column("usage_text", String(500), default="", server_default="", nullable=False)
    model: Mapped[str] = mapped_column(String(100), default="通用模型", server_default="通用模型", nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    preview: Mapped[str] = mapped_column(Text, nullable=False)

    # pending 投稿待审核；approved 已公开；rejected 退回；archived 管理员下架。
    status: Mapped[str] = mapped_column(String(30), default="pending", server_default="pending", nullable=False, index=True)
    submitter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
