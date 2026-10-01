"""公告接口接收和返回的数据结构。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


AnnouncementCategory = Literal["重要", "比赛", "项目", "讲座", "通知"]


class AnnouncementCreateRequest(BaseModel):
    """前端新建公告时可以提交的字段。"""

    category: AnnouncementCategory
    title: str = Field(min_length=1, max_length=200)
    detail: str = Field(min_length=1)
    date: str = Field(min_length=1, max_length=20)
    scope: str = Field(default="全站公开", min_length=1, max_length=50)
    published: bool = True

    @field_validator("title", "detail", "date", "scope", mode="before")
    @classmethod
    def trim_text(cls, value: str) -> str:
        """去掉首尾空格；去空格后为空的值会被长度规则拒绝。"""

        return value.strip() if isinstance(value, str) else value


class AnnouncementUpdateRequest(BaseModel):
    """前端编辑公告时可以提交部分字段。"""

    category: AnnouncementCategory | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    detail: str | None = Field(default=None, min_length=1)
    date: str | None = Field(default=None, min_length=1, max_length=20)
    scope: str | None = Field(default=None, min_length=1, max_length=50)
    published: bool | None = None

    @field_validator("title", "detail", "date", "scope", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        """编辑时也先去掉首尾空格，避免保存只有空格的内容。"""

        return value.strip() if isinstance(value, str) else value

    model_config = ConfigDict(populate_by_name=True)


class AnnouncementResponse(BaseModel):
    """前端展示公告所需的字段。"""

    id: str
    category: AnnouncementCategory
    title: str
    detail: str
    date: str
    scope: str
    published: bool
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: str | None = Field(default=None, alias="createdBy")
    updated_by: str | None = Field(default=None, alias="updatedBy")
    published_at: datetime | None = Field(default=None, alias="publishedAt")

    @field_validator("id", "created_by", "updated_by", mode="before")
    @classmethod
    def convert_ids_to_strings(cls, value: int | str | None) -> str | None:
        """数据库用整数编号，接口统一返回字符串编号。"""

        return str(value) if value is not None else None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
