"""
 @File : resources.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源库接口数据模型。

schemas 只负责：
1. 校验前端提交的数据；
2. 定义接口返回给前端的数据格式。

真正的数据库读写放在 crud/resources.py。
"""

from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


ResourceAccessMode = Literal[
    "external_link",
    "attachment",
    "article",
]

ResourceStatus = Literal[
    "draft",
    "pending",
    "published",
    "archived",
    "offline",
]

ResourceVisibility = Literal[
    "public",
    "members",
    "contributors",
]


class ResourceAttachment(BaseModel):
    """
    资源附件信息。

    一个资源可以没有附件，也可以有多个附件。
    """

    id: str | None = None

    asset_id: str | None = Field(
        default=None,
        alias="assetId",
    )

    name: str = Field(
        min_length=1,
        max_length=200,
    )

    url: str = Field(
        min_length=1,
        max_length=500,
    )

    mime_type: str | None = Field(
        default=None,
        alias="mimeType",
    )

    size: int | None = Field(
        default=None,
        ge=0,
    )

    sort_order: int = Field(
        default=0,
        alias="sortOrder",
        ge=0,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ResourceLink(BaseModel):
    """资源外链及其用途说明，供资源详情页逐条展示。"""

    title: str = Field(
        min_length=1,
        max_length=160,
    )

    url: str = Field(
        min_length=1,
        max_length=500,
    )

    description: str | None = Field(
        default=None,
        max_length=500,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )

    @field_validator("title", "url", mode="before")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        """去掉链接标题和地址两端空格，避免保存后展示出错。"""

        return value.strip() if isinstance(value, str) else value

    @field_validator("description", mode="before")
    @classmethod
    def trim_description(cls, value: str | None) -> str | None:
        """用途说明可选；全空格按未填写处理。"""

        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        """只保存浏览器可打开的 HTTP 或 HTTPS 外链。"""

        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("链接地址必须是 http 或 https 地址")
        return value


class ResourceCreateRequest(BaseModel):
    """
    创建资源时接收的数据。

    浏览量、创建人和修改人不由前端提交，
    这些字段应该由后端自动处理。
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

    # Python 中叫 resource_type，
    # 前端提交和返回时叫 type。
    resource_type: str = Field(
        alias="type",
        min_length=1,
        max_length=30,
    )

    tags: list[str] = Field(
        default_factory=list,
    )

    author: str = Field(
        min_length=1,
        max_length=100,
    )

    access_mode: ResourceAccessMode = Field(
        default="external_link",
        alias="accessMode",
    )

    visibility: ResourceVisibility = "members"

    resource_url: str | None = Field(
        default=None,
        alias="resourceUrl",
        max_length=500,
    )

    # 多个外链保存在 JSON 列中；resource_url 继续保留，兼容旧版前端。
    links: list[ResourceLink] = Field(
        default_factory=list,
    )

    download_url: str | None = Field(
        default=None,
        alias="downloadUrl",
        max_length=500,
    )

    content: str | None = None

    attachments: list[ResourceAttachment] = Field(
        default_factory=list,
    )

    accent: str = Field(
        default="blue",
        max_length=20,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ResourceUpdateRequest(BaseModel):
    """
    修改资源时接收的数据。

    所有字段都是可选的，提交哪个字段就修改哪个字段。
    """

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    resource_type: str | None = Field(
        default=None,
        alias="type",
        min_length=1,
        max_length=30,
    )

    tags: list[str] | None = None

    author: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    access_mode: ResourceAccessMode | None = Field(
        default=None,
        alias="accessMode",
    )

    status: ResourceStatus | None = None

    visibility: ResourceVisibility | None = None

    resource_url: str | None = Field(
        default=None,
        alias="resourceUrl",
        max_length=500,
    )

    # PATCH 时未提供 links 表示不改；传空数组表示清空所有链接。
    # 不接受 null，避免写入数据库的 NOT NULL JSON 字段。
    links: list[ResourceLink] = Field(default_factory=list)

    download_url: str | None = Field(
        default=None,
        alias="downloadUrl",
        max_length=500,
    )

    content: str | None = None

    attachments: list[ResourceAttachment] | None = None

    accent: str | None = Field(
        default=None,
        max_length=20,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ResourceResponse(BaseModel):
    """
    返回给前端的资源数据。

    这里包含浏览量和收藏数量，
    但这些统计字段不能由前端直接修改。
    """

    id: str

    title: str

    description: str

    category: str

    resource_type: str = Field(
        validation_alias="resource_type",
        serialization_alias="type",
    )

    tags: list[str] = Field(
        default_factory=list,
    )

    author: str

    access_mode: ResourceAccessMode = Field(
        default="external_link",
        alias="accessMode",
    )

    status: ResourceStatus = "published"

    visibility: ResourceVisibility = "members"

    resource_url: str | None = Field(
        default=None,
        alias="resourceUrl",
    )

    links: list[ResourceLink] = Field(
        default_factory=list,
    )

    download_url: str | None = Field(
        default=None,
        alias="downloadUrl",
    )

    content: str | None = None

    attachments: list[ResourceAttachment] = Field(
        default_factory=list,
    )

    accent: str = "blue"

    views: int = Field(
        default=0,
        ge=0,
    )

    favorite_count: int = Field(
        default=0,
        alias="favoriteCount",
        ge=0,
    )

    is_favorited: bool = Field(
        default=False,
        alias="isFavorited",
    )

    # 兼容前端 Resource 类型中的 updated 字段。
    # 后续在 router 中根据 updated_at 生成。
    updated: str | None = None

    created_by: int | None = Field(
        default=None,
        alias="createdBy",
    )

    updated_by: int | None = Field(
        default=None,
        alias="updatedBy",
    )

    cohort_id: str | None = Field(
        default=None,
        alias="cohortId",
    )

    created_at: datetime | None = Field(
        default=None,
        alias="createdAt",
    )

    updated_at: datetime | None = Field(
        default=None,
        alias="updatedAt",
    )

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        """把数据库整数编号转换成前端使用的字符串编号。"""

        return str(value)

    @field_validator("cohort_id", mode="before")
    @classmethod
    def convert_cohort_id_to_string(cls, value: int | str | None) -> str | None:
        """把数据库届次编号转换成前端使用的字符串编号。"""

        return str(value) if value is not None else None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
