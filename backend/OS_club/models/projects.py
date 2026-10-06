"""
 @File : projects.py.py
 @Author : 加个真朋友
@Description :
"""
"""
项目数据库模型。
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Project(Base):
    """
    项目库数据表。

    一个项目对应项目库中的一张项目卡片，
    也可以在项目详情页展示更完整的信息。
    """

    __tablename__ = "projects"

    # 项目自己的编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 项目名称。
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # 项目地址中的唯一标识，例如 ai-campus。
    slug: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    # 项目简介。
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # 项目的详细介绍。
    intro: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 项目相关链接。
    github_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    docs_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    demo_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    issue_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # 项目文件下载地址。
    download_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # 项目封面图片地址。
    cover_image: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # 项目展示图片地址列表，按前端展示顺序保存。
    gallery_images: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 技术栈，例如 ["Python", "FastAPI", "Vue3"]。
    stack: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 项目当前成员数量。
    member_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # 项目获得的收藏或点赞数量。
    stars: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # 项目被查看的次数。
    views: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # 项目状态：招募中、维护中、已归档。
    status: Mapped[str] = mapped_column(
        String(20),
        default="维护中",
        server_default="维护中",
        nullable=False,
    )

    # 难度等级，例如 1 到 5。
    difficulty: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )

    # 项目所属年份。
    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # 项目分类，例如 AI、Web、Backend。
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 前端卡片使用的颜色和图标。
    accent: Mapped[str] = mapped_column(
        String(20),
        default="blue",
        server_default="blue",
        nullable=False,
    )

    icon: Mapped[str] = mapped_column(
        String(50),
        default="rocket",
        server_default="rocket",
        nullable=False,
    )

    # 是否在首页或项目库重点展示。
    featured: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    # 项目可见范围：public、members、contributors。
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="public",
        server_default="public",
        nullable=False,
    )

    # 项目里程碑列表，暂时使用 JSON 保存。
    milestones: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 项目开发日志列表，暂时使用 JSON 保存。
    logs: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 参与项目的成员 ID 列表。
    member_ids: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 是否允许成员申请加入项目。
    join_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    # 项目加入说明。
    join_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 内容审核状态。
    review_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    # 审核意见。
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 提交项目的用户。
    submitted_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 审核人。
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 审核时间。
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
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
