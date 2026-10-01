"""
 @File : cohorts.py.py
 @Author : 加个真朋友
@Description :
"""
"""
届次和小组的数据库模型。
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Cohort(Base):
    """
    届次模型。

    例如：
    2029 届、2030 届。
    """

    __tablename__ = "cohorts"

    # 届次在数据库中的编号。
    # 这是数据库主键，不是届次年份。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 届次年份，例如 "2029"。
    # 一个年份通常只对应一个届次，所以设置为唯一。
    year: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    # 对外展示的届次名称。
    # 例如："第四代 · 共学进行中"
    generation_label: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # 届次状态：
    # active   当前进行中的届次
    # archived 已归档的届次
    # draft    还没有正式启用的届次
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        server_default="draft",
        nullable=False,
    )

    # 届次介绍。
    description: Mapped[str] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    # 创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # 最后修改时间。
    # onupdate 表示每次更新这条记录时自动刷新时间。
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CohortTeam(Base):
    """
    届次下面的小组模型。

    一个届次可以拥有多个小组，例如：
    算法组、项目组、网安组。
    """

    __tablename__ = "cohort_teams"

    # 小组自己的数据库编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 这个小组属于哪个届次。
    # 例如 cohort_id=1 表示这个小组属于 id 为 1 的届次。
    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("cohorts.id"),
        nullable=False,
        index=True,
    )

    # 小组名称，例如“算法组”。
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 小组介绍。
    description: Mapped[str] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    # 前端显示用的颜色名称，例如 violet、blue、rose。
    accent: Mapped[str] = mapped_column(
        String(20),
        default="blue",
        server_default="blue",
        nullable=False,
    )

    # 小组最多容纳多少人。
    # 允许为空，表示暂时不限制人数。
    member_capacity: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    # 创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # 最后修改时间。
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
