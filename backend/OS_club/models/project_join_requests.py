"""
项目加入申请数据库模型。
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class ProjectJoinRequest(Base):
    """
    用户申请加入项目的记录。

    一条记录表示一个用户对一个项目发起的一次申请。
    """

    __tablename__ = "project_join_requests"

    # 申请记录自己的编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 用户申请加入的项目。
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id"),
        nullable=False,
        index=True,
    )

    # 发起申请的用户。
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # 用户填写的申请说明。
    message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 申请状态：pending、approved、rejected。
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
        index=True,
    )

    # 管理员审核时填写的意见。
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 执行审核的用户。
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 审核完成时间。
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # 申请创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # 申请最后修改时间。
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
