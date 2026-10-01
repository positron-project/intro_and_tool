"""
 @File : notifications.py
 @Author : 加个真朋友
@Description :
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Notification(Base):
    """一条记录代表发给一个用户的一条站内通知。"""

    __tablename__ = "notifications"
    __table_args__ = (
        # 定时任务可能因服务重启或多进程重复检查；同一个业务事件只保留一条。
        UniqueConstraint("dedupe_key", name="uq_notification_dedupe_key"),
        # 按用户查看未读通知和最近通知时使用同一个组合索引。
        Index("idx_notifications_user_read_created", "user_id", "is_read", "created_at"),
    )

    # 通知自己的编号。
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 接收通知的用户；删除账号时同时删除该用户的私人通知。
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", name="fk_notification_user"),
        nullable=False,
    )

    # 来源类型，例如 competition_reminder、project_review。
    type: Mapped[str] = mapped_column(String(50), nullable=False)

    # 消息列表展示的标题和正文。
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 用户点击消息后前往的页面；允许系统通知没有跳转目标。
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 可选唯一键，用来阻止同一个业务事件重复生成通知。
    dedupe_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # 新通知默认为未读；用户点开后由接口改为已读。
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    # 数据库自动记录通知创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
