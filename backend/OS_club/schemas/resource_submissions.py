"""
 @File : resource_submissions.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源投稿接口数据模型。

投稿数据先进入 resource_submissions 表，
审核通过后才会创建正式的 Resource。
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from schemas.resources import ResourceAttachment, ResourceLink


SubmissionStatus = Literal[
    "pending",
    "approved",
    "rejected",
    "changes_requested",
    "withdrawn",
]

ReviewAction = Literal[
    "approve",
    "reject",
    "request_changes",
]


class ResourceSubmissionCreateRequest(BaseModel):
    """
    用户提交资源投稿时接收的数据。
    """

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    # 前端字段叫 resourceType，
    # Python 字段使用 resource_type。
    resource_type: str = Field(
        alias="resourceType",
        min_length=1,
        max_length=30,
    )

    access_mode: Literal[
        "external_link",
        "attachment",
        "article",
    ] = Field(
        default="external_link",
        alias="accessMode",
    )

    tags: list[str] = Field(
        default_factory=list,
    )

    visibility: Literal[
        "public",
        "members",
        "contributors",
    ] = "members"

    resource_url: str | None = Field(
        default=None,
        alias="resourceUrl",
        max_length=500,
    )

    # 一条投稿可以包含多条有名称和用途说明的外部链接。
    links: list[ResourceLink] = Field(
        default_factory=list,
    )

    file_name: str | None = Field(
        default=None,
        alias="fileName",
        max_length=255,
    )

    attachments: list[ResourceAttachment] = Field(
        default_factory=list,
    )

    content: str | None = None

    # 如果是修改已有资源，可以填写原资源编号。
    target_resource_id: str | None = Field(
        default=None,
        alias="targetResourceId",
    )

    # 当前投稿版本。
    version: int = Field(
        default=1,
        ge=1,
    )

    change_note: str | None = Field(
        default=None,
        alias="changeNote",
        max_length=2000,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ResourceSubmissionReviewRequest(BaseModel):
    """
    管理员审核投稿时接收的数据。
    """

    action: ReviewAction

    review_note: str | None = Field(
        default=None,
        alias="reviewNote",
        max_length=2000,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ResourceSubmissionResponse(BaseModel):
    """
    返回给前端的投稿信息。
    """

    id: str

    submitter_id: str = Field(
        alias="submitterId",
    )

    # 这个字段不是投稿表直接保存的，
    # 后续由 router 查询 users 表后补充。
    submitter_name: str | None = Field(
        default=None,
        alias="submitterName",
    )

    target_resource_id: str | None = Field(
        default=None,
        alias="targetResourceId",
    )

    title: str

    description: str

    category: str

    resource_type: str = Field(
        alias="resourceType",
    )

    access_mode: str = Field(
        alias="accessMode",
    )

    tags: list[str] = Field(
        default_factory=list,
    )

    visibility: str

    resource_url: str | None = Field(
        default=None,
        alias="resourceUrl",
    )

    links: list[ResourceLink] = Field(
        default_factory=list,
    )

    file_name: str | None = Field(
        default=None,
        alias="fileName",
    )

    attachments: list[ResourceAttachment] = Field(
        default_factory=list,
    )

    content: str | None = None

    version: int = 1

    change_note: str | None = Field(
        default=None,
        alias="changeNote",
    )

    status: SubmissionStatus = "pending"

    review_note: str | None = Field(
        default=None,
        alias="reviewNote",
    )

    reviewed_by: str | None = Field(
        default=None,
        alias="reviewedBy",
    )

    reviewed_at: datetime | None = Field(
        default=None,
        alias="reviewedAt",
    )

    submitted_at: datetime = Field(
        alias="submittedAt",
    )

    updated_at: datetime = Field(
        alias="updatedAt",
    )

    @field_validator("id", "submitter_id", "target_resource_id", "reviewed_by", mode="before")
    @classmethod
    def convert_id_to_string(cls, value):
        """
        把数据库中的整数编号转换成前端使用的字符串编号。
        """

        if value is None:
            return None

        return str(value)

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
