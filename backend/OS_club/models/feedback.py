"""访客和成员提交的留言建议数据库模型。"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class FeedbackMessage(Base):
    """保存一条留言建议及管理员的处理状态。"""

    __tablename__ = "feedback_messages"
    __table_args__ = (
        Index("idx_feedback_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    # 留言分类，例如“功能建议”或“内容纠错”。
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 访客提交的具体内容。
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # 留言者可以不留联系方式，因此此字段允许为空。
    contact: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # 可选的截图/图片附件。附件只保存文件元数据，实际文件仍在 uploads/feedback。
    attachments: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 附件的统一过期时间；过期后清理任务只删除图片，不删除留言正文。
    attachments_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # pending：待处理；read：已查看；resolved：已处理。
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    # 管理员处理留言时可以附上说明。
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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
