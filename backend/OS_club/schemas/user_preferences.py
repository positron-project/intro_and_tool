"""个人偏好接口使用的请求和响应格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


UserTheme = Literal["light", "dark"]
BackgroundPreference = Literal["follow", "campus", "mist", "paper", "custom"]


class UserPreferencesUpdateRequest(BaseModel):
    """个人设置支持局部修改；没发送的字段保持原值。"""

    theme: UserTheme | None = None
    background_preference: BackgroundPreference | None = Field(
        default=None,
        alias="backgroundPreference",
    )
    school_background_enabled: bool | None = Field(
        default=None,
        alias="schoolBackgroundEnabled",
    )
    custom_background_asset_id: str | None = Field(
        default=None,
        alias="customBackgroundAssetId",
        max_length=128,
    )
    custom_background_url: str | None = Field(
        default=None,
        alias="customBackgroundUrl",
        max_length=1024,
    )
    reduced_motion: bool | None = Field(default=None, alias="reducedMotion")

    @field_validator(
        "theme",
        "background_preference",
        "school_background_enabled",
        "reduced_motion",
        mode="before",
    )
    @classmethod
    def provided_values_cannot_be_null(cls, value):
        """这些字段可以不提交，但提交时必须给出有效值。"""

        if value is None:
            raise ValueError("主题、背景选项和动效开关不能设置为 null")
        return value

    @field_validator("custom_background_asset_id", "custom_background_url", mode="before")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        """自定义图片字段允许传 null 清除，也去掉文字两侧空格。"""

        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    model_config = ConfigDict(populate_by_name=True)


class UserPreferencesResponse(BaseModel):
    """返回当前账号的偏好设置，字段名遵循前端 camelCase。"""

    theme: UserTheme
    background_preference: BackgroundPreference = Field(alias="backgroundPreference")
    school_background_enabled: bool = Field(alias="schoolBackgroundEnabled")
    custom_background_asset_id: str | None = Field(
        default=None,
        alias="customBackgroundAssetId",
    )
    custom_background_url: str | None = Field(default=None, alias="customBackgroundUrl")
    reduced_motion: bool = Field(alias="reducedMotion")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
