"""
项目加入申请接口数据模型。

这里的模型只负责校验 HTTP 请求和定义返回格式，
真正的数据库读写仍然放在 crud/project_join_requests.py。
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectJoinRequestCreate(BaseModel):
    """登录用户申请加入项目时提交的数据。"""

    message: str | None = Field(
        default=None,
        max_length=2000,
        description="申请人对项目负责人的补充说明",
    )


class ProjectJoinRequestReview(BaseModel):
    """负责人或组长审核加入申请时提交的数据。"""

    status: Literal["approved", "rejected"]
    review_note: str | None = Field(
        default=None,
        max_length=2000,
        alias="reviewNote",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ProjectJoinRequestResponse(BaseModel):
    """返回给前端的项目加入申请。"""

    id: int
    project_id: int = Field(alias="projectId")
    project_name: str | None = Field(
        default=None,
        alias="projectName",
    )
    user_id: int = Field(alias="userId")
    user_name: str | None = Field(
        default=None,
        alias="userName",
    )
    message: str | None = None
    status: Literal["pending", "approved", "rejected"]
    review_note: str | None = Field(
        default=None,
        alias="reviewNote",
    )
    reviewed_by: int | None = Field(
        default=None,
        alias="reviewedBy",
    )
    reviewed_at: datetime | None = Field(
        default=None,
        alias="reviewedAt",
    )
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
