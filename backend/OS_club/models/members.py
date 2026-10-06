"""
 @File : members.py.py
 @Author : 加个真朋友
@Description :
"""
"""
成员目录数据库模型。
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Member(Base):
    """
    成员目录模型。

    这张表保存成员展示资料、所属届次和所属小组。
    它和 users 表中的登录账号是分开的。
    """

    __tablename__ = "members"

    # 成员档案自己的编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 如果这个成员拥有登录账号，就关联 users.id。
    # 历届成员或外部导入成员可以没有登录账号，所以允许为空。
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=True,
        index=True,
    )

    # 成员账号名称，可为空。
    # 没有登录账号的成员不会有这个字段。
    username: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    # 前台展示的姓名。
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 成员在小组中的展示职务。
    # 例如：组员、负责人、组长。
    #
    # 注意：这不是 users.role。
    # users.role 表示账号权限；
    # members.role 表示成员在小组中的展示职务。
    role: Mapped[str] = mapped_column(
        String(20),
        default="组员",
        server_default="组员",
        nullable=False,
    )

    # 所属届次。
    # 暂时没有分配届次时允许为空。
    cohort_id: Mapped[int | None] = mapped_column(
        ForeignKey("cohorts.id"),
        nullable=True,
        index=True,
    )

    # 所属小组。
    # 暂时没有分配小组时允许为空。
    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("cohort_teams.id"),
        nullable=True,
        index=True,
    )

    # 前端显示的方向名称，例如“算法组”。
    direction: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # 头像上显示的缩写，例如“小王”或“ZS”。
    initials: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    # 前端头像背景色。
    accent: Mapped[str] = mapped_column(
        String(20),
        default="blue",
        server_default="blue",
        nullable=False,
    )

    # 头像地址。
    avatar_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # 成员资料状态。
    # active   正常展示
    # hidden   暂时不在前台展示
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        server_default="active",
        nullable=False,
    )

    # 成员资料创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # 成员资料最后修改时间。
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
