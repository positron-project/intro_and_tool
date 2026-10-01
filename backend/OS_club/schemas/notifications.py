"""站内通知接口使用的数据结构。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NotificationResponse(BaseModel):
    """前端展示一条通知所需的字段。"""

    id: str
    type: str
    title: str
    content: str
    link: str | None = None
    dedupe_key: str | None = Field(default=None, alias="dedupeKey")
    is_read: bool = Field(alias="isRead")
    is_actionable: bool = Field(default=False, alias="isActionable")
    created_at: datetime = Field(alias="createdAt")

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        """数据库主键是整数，API 统一以字符串返回给前端。"""

        return str(value)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationPageResponse(BaseModel):
    """通知列表和分页信息。"""

    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")

    model_config = ConfigDict(populate_by_name=True)


class NotificationUnreadCountResponse(BaseModel):
    """当前登录用户的未读通知数量。"""

    unread_count: int = Field(alias="unreadCount")

    model_config = ConfigDict(populate_by_name=True)


class NotificationReadAllResponse(BaseModel):
    """批量标记已读后实际更新的数量。"""

    updated_count: int = Field(alias="updatedCount")

    model_config = ConfigDict(populate_by_name=True)


class NotificationDeleteReadResponse(BaseModel):
    """批量清理后实际删除的已读通知数量。"""

    deleted_count: int = Field(alias="deletedCount")

    model_config = ConfigDict(populate_by_name=True)
