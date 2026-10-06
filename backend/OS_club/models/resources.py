"""
 @File : resources.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源库数据库模型。
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class Resource(Base):
    """
    资源库中的一条资源记录。

    例如：
    - 一篇学习文档
    - 一个 GitHub 项目
    - 一个视频课程
    - 一个可下载文件
    """

    __tablename__ = "resources"

    # 资源编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 资源标题。
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    # 资源简介。
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # 资源分类，例如 backend、frontend、algorithm。
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Python 中使用 resource_type，数据库列名仍然叫 type。
    # 这样可以避免直接使用 Python 内置名称 type。
    resource_type: Mapped[str] = mapped_column(
        "type",
        String(30),
        nullable=False,
    )

    # 资源标签，例如 ["FastAPI", "Python"]。
    tags: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 页面上显示的作者名称。
    author: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # 资源访问方式：external_link、attachment、article。
    access_mode: Mapped[str] = mapped_column(
        String(30),
        default="external_link",
        server_default="external_link",
        nullable=False,
    )

    # 资源状态：draft、published、archived、offline。
    status: Mapped[str] = mapped_column(
        String(20),
        default="published",
        server_default="published",
        nullable=False,
    )

    # 资源可见范围：public、members、contributors。
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="members",
        server_default="members",
        nullable=False,
    )

    # 在线查看地址。
    resource_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # 文件下载地址。
    download_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # 文章正文或资源补充内容。
    content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 上传文件列表。
    attachments: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 前端显示时使用的颜色。
    accent: Mapped[str] = mapped_column(
        String(20),
        default="blue",
        server_default="blue",
        nullable=False,
    )

    # 资源浏览次数。
    views: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # 创建资源的用户。
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 最后修改资源的用户。
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 资源所属届次。为空表示组长创建的全局资源。
    cohort_id: Mapped[int | None] = mapped_column(
        ForeignKey("cohorts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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
