"""全站站点设置接口使用的请求和响应格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


SiteTheme = Literal["light", "dark"]


class SiteSettingsUpdateRequest(BaseModel):
    """接收管理员提交的部分站点设置。"""

    theme: SiteTheme | None = None
    school_background_enabled: bool | None = Field(default=None, alias="schoolBackgroundEnabled")
    custom_background_asset_id: str | None = Field(default=None, alias="customBackgroundAssetId", max_length=128)

    @field_validator("theme", "school_background_enabled", mode="before")
    @classmethod
    def required_values_cannot_be_null(cls, value):
        """PATCH 可以省略字段，但不能把非空设置改成 null。"""

        if value is None:
            raise ValueError("主题和校园背景开关不能设置为 null")
        return value

    @field_validator("custom_background_asset_id", mode="before")
    @classmethod
    def clean_asset_id(cls, value: str | None) -> str | None:
        """资源 ID 去除空格；空字符串按清除图片处理。"""

        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    model_config = ConfigDict(populate_by_name=True)


class SiteSettingsResponse(BaseModel):
    """返回站点外观设置，使用前端约定的 camelCase 字段名。"""

    theme: SiteTheme
    school_background_enabled: bool = Field(alias="schoolBackgroundEnabled")
    custom_background_asset_id: str | None = Field(default=None, alias="customBackgroundAssetId")

    # 目前全局设置表只保存 asset ID；URL 由上传记录关联功能后再返回。
    custom_background_url: str | None = Field(default=None, alias="customBackgroundUrl")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
