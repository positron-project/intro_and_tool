"""
 @File : resource_submissions.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源投稿数据库模型。

用户提交资料后，先保存到 resource_submissions 表，
管理员审核通过后，再创建正式的 Resource 记录。
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class ResourceSubmission(Base):
    """
    资源投稿记录。

    一条投稿记录表示用户提交了一次资源审核申请。
    """

    __tablename__ = "resource_submissions"

    # 投稿编号。
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # 投稿用户编号。
    submitter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    # 如果是修改已有资源，这里记录原资源编号。
    # 新投稿时为空。
    target_resource_id: Mapped[int | None] = mapped_column(
        ForeignKey("resources.id"),
        nullable=True,
    )

    # 投稿标题。
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    # 投稿简介。
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # 资源分类。
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # 资源类型，例如 article、video、file。
    resource_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    # 资源访问方式。
    access_mode: Mapped[str] = mapped_column(
        String(30),
        default="external_link",
        server_default="external_link",
        nullable=False,
    )

    # 资源标签。
    tags: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 资源可见范围。
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="members",
        server_default="members",
        nullable=False,
    )

    # 在线资源地址。
    resource_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # 保存投稿人填写的多条外部链接，审核通过时会一并复制到正式资源。
    links: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 上传文件名称。
    file_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # 附件列表。
    attachments: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    # 文章正文或补充内容。
    content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 如果是修改已有资源，表示修改说明。
    change_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 资源版本号。
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )

    # 投稿状态：
    # pending：待审核
    # approved：已通过
    # rejected：已拒绝
    # changes_requested：要求修改
    # withdrawn：投稿人撤回
    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    # 管理员审核意见。
    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # 审核人编号。
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    # 审核时间。
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # 投稿创建时间。
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # 投稿最后修改时间。
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
