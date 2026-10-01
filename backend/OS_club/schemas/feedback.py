"""留言建议接口接收和返回的数据结构。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


FeedbackStatus = Literal["pending", "read", "resolved"]
FeedbackUpdateStatus = Literal["read", "resolved"]


class FeedbackCreateRequest(BaseModel):
    """访客提交留言时允许提供的字段。"""

    category: str = Field(min_length=1, max_length=50)
    content: str = Field(min_length=1, max_length=1000)
    contact: str | None = Field(default=None, max_length=255)

    @field_validator("category", "content", "contact", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        """去掉用户输入首尾空格，避免空格被误当成有效内容。"""

        return value.strip() if isinstance(value, str) else value


class FeedbackUpdateRequest(BaseModel):
    """管理员修改留言的处理状态或处理说明。"""

    status: FeedbackUpdateStatus | None = None
    review_note: str | None = Field(default=None, max_length=2000, alias="reviewNote")

    @field_validator("review_note", mode="before")
    @classmethod
    def trim_review_note(cls, value: str | None) -> str | None:
        """把空白审核说明归一化为空值。"""

        return value.strip() or None if isinstance(value, str) else value

    model_config = ConfigDict(populate_by_name=True)


class FeedbackResponse(BaseModel):
    """前端显示留言建议所需的数据。"""

    id: str
    category: str
    content: str
    contact: str | None = None
    created_at: datetime = Field(alias="createdAt")
    status: FeedbackStatus
    review_note: str | None = Field(default=None, alias="reviewNote")

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        """数据库主键是整数，前端服务统一按字符串处理编号。"""

        return str(value)

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
