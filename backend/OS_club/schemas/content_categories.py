"""内容分类接口数据模型。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


CategoryResource = Literal["projects", "resources", "interviews"]


class ContentCategoryCreateRequest(BaseModel):
    """创建分类时接收的数据。"""

    resource: CategoryResource
    key: str = Field(min_length=1, max_length=50)
    label: str = Field(min_length=1, max_length=50)
    description: str | None = None
    accent: str = Field(default="blue", max_length=20)
    icon: str = Field(default="folder", max_length=50)
    order: int = Field(default=0, ge=0)
    enabled: bool = True
    # 内置分类只能由系统种子数据创建，客户端不能伪造。
    built_in: bool = Field(default=False, alias="builtIn")

    model_config = ConfigDict(populate_by_name=True)


class ContentCategoryUpdateRequest(BaseModel):
    """修改分类时接收的数据。"""

    key: str | None = Field(default=None, min_length=1, max_length=50)
    label: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
    accent: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=50)
    order: int | None = Field(default=None, ge=0)
    enabled: bool | None = None

    model_config = ConfigDict(populate_by_name=True)


class ContentCategoryResponse(BaseModel):
    """返回给前端的分类。"""

    id: str
    resource: CategoryResource
    key: str = Field(
        validation_alias="category_key",
        serialization_alias="key",
    )
    label: str
    description: str | None = None
    accent: str
    icon: str
    order: int = Field(
        validation_alias="sort_order",
        serialization_alias="order",
    )
    enabled: bool
    built_in: bool = Field(alias="builtIn")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        """把数据库整数编号转换成前端统一使用的字符串。"""

        return str(value)

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
