"""
 @File : invites.py
 @Author : 加个真朋友
@Description : 邀请码数据库模型
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class InviteCode(Base):
    """
    邀请码数据库模型。
    一个邀请码可以被一个或多个用户使用。
    """

    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 邀请码内容，例如 OS-A7K2-9QPL
    code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
    )

    # 使用邀请码后获得的角色
    role: Mapped[str] = mapped_column(
        String(20),
        default="Contributor",
        server_default="Contributor",
        nullable=False,
    )

    # 兑换后写入成员所属届次和方向，便于自动归组。
    cohort: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    direction: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # 邀请码失效时间
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    # 最多可以使用多少次
    max_uses: Mapped[int] = mapped_column(
        nullable=False,
    )

    # 已经使用了多少次
    used_count: Mapped[int] = mapped_column(
        default=0,
        server_default="0",
        nullable=False,
    )

    # 创建邀请码的管理员
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    # 撤销时间；没有撤销时为空
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # 创建时间
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
