"""操作日志接口返回的数据格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AuditLogResponse(BaseModel):
    """前端日志表格需要展示的字段。"""

    id: str
    actor_id: str | None = Field(alias="actorId")
    actor_name: str = Field(alias="actorName")
    action: str
    resource_type: str = Field(alias="resourceType")
    resource_id: str | None = Field(default=None, alias="resourceId")
    target: str
    result: Literal["success", "failure"]
    created_at: datetime = Field(alias="createdAt")

    @field_validator("id", "actor_id", mode="before")
    @classmethod
    def convert_ids_to_strings(cls, value: int | str | None) -> str | None:
        if value is None:
            return None
        return str(value)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AuditLogActionResponse(BaseModel):
    """删除操作日志后返回的记录数量。"""

    affected_count: int = Field(alias="affectedCount")

    model_config = ConfigDict(populate_by_name=True)
