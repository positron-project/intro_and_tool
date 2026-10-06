"""面经内容、投稿状态和有帮助投票的数据模型。"""

from datetime import datetime

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


class Interview(Base):
    """面经内容与投稿记录共用的主表。"""

    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    author: Mapped[str] = mapped_column(String(100), nullable=False)
    cohort: Mapped[str] = mapped_column(String(30), default="", server_default="", nullable=False, index=True)
    date: Mapped[str] = mapped_column(String(30), default="", server_default="", nullable=False)
    recruitment_type: Mapped[str] = mapped_column(String(30), default="实习", server_default="实习", nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    city: Mapped[str | None] = mapped_column(String(60), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="中等", server_default="中等", nullable=False)
    rounds: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    round_details: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    preparation: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    anonymous: Mapped[bool] = mapped_column(default=False, server_default="0", nullable=False)
    views: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    visibility: Mapped[str] = mapped_column(String(20), default="members", server_default="members", nullable=False, index=True)

    # 投稿记录的生命周期：draft -> pending -> approved/rejected/changes_requested。
    status: Mapped[str] = mapped_column(String(30), default="draft", server_default="draft", nullable=False, index=True)
    submitter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_history: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class InterviewHelpfulVote(Base):
    """每个账号对同一条面经最多保留一张有帮助票。"""

    __tablename__ = "interview_helpful_votes"
    __table_args__ = (
        UniqueConstraint("interview_id", "user_id", name="uq_interview_helpful_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    interview_id: Mapped[int] = mapped_column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
