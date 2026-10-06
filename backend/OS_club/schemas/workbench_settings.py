"""首页工作台设置接口使用的请求和响应格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


WorkbenchFeedType = Literal["announcement", "project", "resource"]


class WorkbenchFeedItemData(BaseModel):
    """动态模块中一个被选中的公告、项目或资源。"""

    type: WorkbenchFeedType
    id: str = Field(min_length=1, max_length=100)

    @field_validator("id", mode="before")
    @classmethod
    def trim_id(cls, value: str) -> str:
        """去除 ID 两侧空格，避免保存无效引用。"""

        return value.strip() if isinstance(value, str) else value


class WorkbenchSettingsUpdateRequest(BaseModel):
    """前端保存工作台时提交的完整设置。"""

    live_enabled: bool = Field(alias="liveEnabled")
    live_title: str = Field(alias="liveTitle", min_length=1, max_length=200)
    live_subtitle: str = Field(alias="liveSubtitle", max_length=500)
    live_items: list[WorkbenchFeedItemData] = Field(alias="liveItems")
    live_rotation_seconds: float = Field(alias="liveRotationSeconds", ge=2, le=30)

    projects_enabled: bool = Field(alias="projectsEnabled")
    projects_title: str = Field(alias="projectsTitle", min_length=1, max_length=200)
    project_ids: list[str] = Field(alias="projectIds")
    project_rotation_seconds: float = Field(alias="projectRotationSeconds", ge=2, le=30)

    @field_validator("live_title", "live_subtitle", "projects_title", mode="before")
    @classmethod
    def trim_text(cls, value: str) -> str:
        """保存前去掉文字首尾的空格。"""

        return value.strip() if isinstance(value, str) else value

    @field_validator("project_ids", mode="before")
    @classmethod
    def trim_project_ids(cls, value: list[str]) -> list[str]:
        """清理项目 ID，并拒绝空白 ID。"""

        if isinstance(value, list):
            return [item.strip() if isinstance(item, str) else item for item in value]
        return value

    @field_validator("project_ids")
    @classmethod
    def validate_project_ids(cls, value: list[str]) -> list[str]:
        """项目 ID 必须非空且长度不能超过数据库字段约定。"""

        if any(not item or len(item) > 100 for item in value):
            raise ValueError("项目 ID 不能为空且不能超过 100 个字符")
        return value

    model_config = ConfigDict(populate_by_name=True)


class WorkbenchSettingsResponse(BaseModel):
    """返回工作台设置；字段别名与前端 WorkbenchSettings 一致。"""

    live_enabled: bool = Field(alias="liveEnabled")
    live_title: str = Field(alias="liveTitle")
    live_subtitle: str = Field(alias="liveSubtitle")
    live_items: list[WorkbenchFeedItemData] = Field(alias="liveItems")
    live_rotation_seconds: float = Field(alias="liveRotationSeconds")

    projects_enabled: bool = Field(alias="projectsEnabled")
    projects_title: str = Field(alias="projectsTitle")
    project_ids: list[str] = Field(alias="projectIds")
    project_rotation_seconds: float = Field(alias="projectRotationSeconds")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
