"""站点文案接口的数据格式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SiteCopyUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = None
    author: str | None = Field(default=None, max_length=150)


class SiteCopyResponse(BaseModel):
    id: str
    label: str
    title: str
    body: str
    author: str | None = None
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
