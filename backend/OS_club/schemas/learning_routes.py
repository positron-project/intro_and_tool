"""学习路线接口使用的请求校验和响应格式。"""

from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


LearningRouteVisibility = Literal["public", "members", "contributors"]


class LearningLinkData(BaseModel):
    """学习节点中的一条文档、视频或网盘链接。"""

    id: str = Field(min_length=1, max_length=100)
    title: str = Field(default="", max_length=200)
    url: str = Field(min_length=1, max_length=2048)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("id", "url", mode="before")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        """去掉编号和链接地址两边多余的空格。"""

        return value.strip() if isinstance(value, str) else value

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, value: str) -> str:
        """名称可以留空，前端会显示默认名称。"""

        return value.strip() if isinstance(value, str) else value

    @field_validator("description", mode="before")
    @classmethod
    def trim_description(cls, value: str | None) -> str | None:
        """说明可选，空白输入按未填写处理。"""

        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        """只接受可在浏览器打开的 HTTP 或 HTTPS 链接。"""

        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("链接地址必须是 http 或 https 地址")
        return value

    model_config = ConfigDict(populate_by_name=True)


class LearningNodeData(BaseModel):
    """学习路线中的一个节点；字段名与前端 LearningNode 一致。"""

    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    duration: str = Field(default="待定", max_length=100)
    resources: int = Field(default=0, ge=0)
    projects: int = Field(default=0, ge=0)
    description: str | None = Field(default=None, max_length=5000)
    project_ids: list[str] = Field(default_factory=list, alias="projectIds")
    resource_ids: list[str] = Field(default_factory=list, alias="resourceIds")
    resource_links: list[LearningLinkData] = Field(default_factory=list, alias="resourceLinks")
    video_links: list[LearningLinkData] | None = Field(default=None, alias="videoLinks")
    cloud_drive_links: list[LearningLinkData] = Field(default_factory=list, alias="cloudDriveLinks")
    video_title: str | None = Field(default=None, max_length=200, alias="videoTitle")
    video_url: str | None = Field(default=None, max_length=2048, alias="videoUrl")

    @field_validator("id", "title", mode="before")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        """节点编号和标题去掉首尾空格，避免空白字符串通过校验。"""

        return value.strip() if isinstance(value, str) else value

    @field_validator("video_title", "video_url", mode="before")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        """Optional course fields treat whitespace-only values as empty."""

        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("video_url")
    @classmethod
    def validate_video_url(cls, value: str | None) -> str | None:
        """Only accept normal web links for external course pages."""

        if value is None:
            return None
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("教程链接必须是 http 或 https 地址")
        return value

    model_config = ConfigDict(populate_by_name=True)


class LearningRouteCreateRequest(BaseModel):
    """新增路线时允许前端提交的字段；ID 和时间由后端生成。"""

    title: str = Field(min_length=1, max_length=200)
    direction: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=10000)
    nodes: list[LearningNodeData] = Field(default_factory=list)
    featured_project_ids: list[str] = Field(default_factory=list, alias="featuredProjectIds")
    visibility: LearningRouteVisibility = "public"

    @field_validator("title", "direction", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str) -> str:
        """保存前去除普通文字字段首尾的空格。"""

        return value.strip() if isinstance(value, str) else value

    model_config = ConfigDict(populate_by_name=True)


class LearningRouteUpdateRequest(BaseModel):
    """编辑路线时只提交需要修改的字段。"""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    direction: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=10000)
    nodes: list[LearningNodeData] | None = None
    featured_project_ids: list[str] | None = Field(default=None, alias="featuredProjectIds")
    visibility: LearningRouteVisibility | None = None

    @field_validator("title", "direction", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        """编辑时也清理文字字段；未提交的字段保持原样。"""

        return value.strip() if isinstance(value, str) else value

    model_config = ConfigDict(populate_by_name=True)


class LearningRouteResponse(BaseModel):
    """返回给前端的路线；JSON 字段名使用前端的 camelCase 格式。"""

    id: str
    title: str
    direction: str
    description: str
    nodes: list[LearningNodeData]
    featured_project_ids: list[str] = Field(alias="featuredProjectIds")
    visibility: LearningRouteVisibility
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
