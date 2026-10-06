"""Prompt 模板接口收发的数据格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PromptFields(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    usage: str = Field(default="", max_length=500)
    model: str = Field(default="通用模型", max_length=100)
    category: str = Field(min_length=1, max_length=50)
    # 现有前端把完整 Prompt 文本放在 preview 字段中并用它复制。
    preview: str = Field(min_length=1, max_length=4000)


class PromptCreateRequest(PromptFields):
    """管理员直接创建已发布的模板。"""


class PromptSubmissionRequest(PromptFields):
    """成员提交一条等待审核的模板。"""


class PromptUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    usage: str | None = Field(default=None, max_length=500)
    model: str | None = Field(default=None, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    preview: str | None = Field(default=None, min_length=1, max_length=4000)


class PromptReviewRequest(BaseModel):
    status: Literal["approved", "rejected", "changes_requested"]
    review_note: str | None = Field(default=None, max_length=1000, alias="reviewNote")

    model_config = ConfigDict(populate_by_name=True)


class PromptResponse(PromptFields):
    id: str
    status: str = "approved"
    favorite_count: int = Field(default=0, alias="favoriteCount")
    is_favorited: bool = Field(default=False, alias="isFavorited")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    @field_validator("id", mode="before")
    @classmethod
    def id_as_string(cls, value: int | str) -> str:
        return str(value)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PromptReviewResponse(PromptResponse):
    submitter_id: str | None = Field(default=None, alias="submitterId")
    submitter_name: str | None = Field(default=None, alias="submitterName")
    submitter_cohort: str | None = Field(default=None, alias="submitterCohort")
    submitter_direction: str | None = Field(default=None, alias="submitterDirection")
    submitted_at: datetime | None = Field(default=None, alias="submittedAt")
    reviewed_at: datetime | None = Field(default=None, alias="reviewedAt")
    review_note: str | None = Field(default=None, alias="reviewNote")


class PromptResult(BaseModel):
    data: PromptResponse
