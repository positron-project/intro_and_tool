"""面经接口的请求校验与响应结构。"""

from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


InterviewDifficulty = Literal["简单", "中等", "困难"]
RecruitmentType = Literal["实习", "校招", "社招", "日常招聘"]
InterviewStatus = Literal["draft", "pending", "approved", "rejected", "changes_requested", "withdrawn"]
ReviewAction = Literal["approve", "reject", "request_changes"]
InterviewVisibility = Literal["public", "members", "contributors"]
ResultData = TypeVar("ResultData")


class InterviewResult(BaseModel, Generic[ResultData]):
    """统一面经接口成功响应，和前端 api-client 的 Result 约定保持一致。"""

    code: int = 200
    msg: str = "success"
    data: ResultData | None = None


class InterviewQuestion(BaseModel):
    question: str = Field(default="", max_length=2000)
    answer: str | None = Field(default=None, max_length=4000)


class InterviewRound(BaseModel):
    title: str = Field(default="", max_length=50)
    questions: list[InterviewQuestion] = Field(default_factory=list, max_length=100)


class InterviewSubmissionCreateRequest(BaseModel):
    """新建草稿使用的面经字段；账号、届次和审核状态由服务端决定。"""

    company: str = Field(default="", max_length=100)
    role: str = Field(default="", max_length=100)
    date: str = Field(default="", max_length=30)
    recruitment_type: RecruitmentType = Field(default="实习", alias="recruitmentType")
    category: str | None = Field(default=None, max_length=50)
    city: str | None = Field(default=None, max_length=60)
    difficulty: InterviewDifficulty = "中等"
    rounds: int = Field(default=1, ge=1, le=100)
    round_details: list[InterviewRound] = Field(default_factory=list, alias="roundDetails", max_length=100)
    preparation: str | None = Field(default=None, max_length=10000)
    summary: str = Field(default="", max_length=10000)
    reflection: str | None = Field(default=None, max_length=10000)
    tags: list[str] = Field(default_factory=list, max_length=12)
    anonymous: bool = False

    model_config = ConfigDict(populate_by_name=True)


class InterviewSubmissionUpdateRequest(BaseModel):
    """草稿或退回投稿的部分更新字段。"""

    company: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, max_length=100)
    date: str | None = Field(default=None, max_length=30)
    recruitment_type: RecruitmentType | None = Field(default=None, alias="recruitmentType")
    category: str | None = Field(default=None, max_length=50)
    city: str | None = Field(default=None, max_length=60)
    difficulty: InterviewDifficulty | None = None
    rounds: int | None = Field(default=None, ge=1, le=100)
    round_details: list[InterviewRound] | None = Field(default=None, alias="roundDetails", max_length=100)
    preparation: str | None = Field(default=None, max_length=10000)
    summary: str | None = Field(default=None, max_length=10000)
    reflection: str | None = Field(default=None, max_length=10000)
    tags: list[str] | None = Field(default=None, max_length=12)
    anonymous: bool | None = None

    model_config = ConfigDict(populate_by_name=True)


class InterviewCreateRequest(InterviewSubmissionCreateRequest):
    """审核人员直接创建已发布的面经。"""

    author: str = Field(min_length=1, max_length=100)
    cohort: str = Field(min_length=1, max_length=30)
    visibility: InterviewVisibility = "members"


class InterviewUpdateRequest(InterviewSubmissionUpdateRequest):
    """审核人员修改已发布面经时可调整的字段。"""

    author: str | None = Field(default=None, min_length=1, max_length=100)
    cohort: str | None = Field(default=None, min_length=1, max_length=30)
    visibility: InterviewVisibility | None = None


class InterviewReviewRequest(BaseModel):
    action: ReviewAction
    review_note: str | None = Field(default=None, alias="reviewNote", max_length=2000)

    model_config = ConfigDict(populate_by_name=True)


class InterviewReviewRecordResponse(BaseModel):
    id: str
    action: ReviewAction
    status: Literal["approved", "rejected", "changes_requested"]
    reviewer_name: str = Field(alias="reviewerName")
    note: str | None = None
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class InterviewResponse(BaseModel):
    id: str
    company: str
    role: str
    author: str
    cohort: str
    date: str
    recruitment_type: str = Field(alias="recruitmentType")
    category: str | None = None
    city: str | None = None
    difficulty: InterviewDifficulty
    rounds: int
    round_details: list[InterviewRound] = Field(default_factory=list, alias="roundDetails")
    preparation: str | None = None
    summary: str
    reflection: str | None = None
    tags: list[str] = Field(default_factory=list)
    anonymous: bool = False
    views: int = 0
    helpful_count: int = Field(default=0, alias="helpfulCount")
    is_helpful: bool = Field(default=False, alias="isHelpful")
    favorite_count: int = Field(default=0, alias="favoriteCount")
    is_favorited: bool = Field(default=False, alias="isFavorited")
    visibility: InterviewVisibility = "members"
    status: InterviewStatus | None = None
    submitter_id: str | None = Field(default=None, alias="submitterId")
    submitter_name: str | None = Field(default=None, alias="submitterName")
    submitted_at: datetime | None = Field(default=None, alias="submittedAt")
    withdrawn_at: datetime | None = Field(default=None, alias="withdrawnAt")
    reviewed_at: datetime | None = Field(default=None, alias="reviewedAt")
    review_note: str | None = Field(default=None, alias="reviewNote")
    review_history: list[InterviewReviewRecordResponse] = Field(default_factory=list, alias="reviewHistory")
    version: int = 1
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    created_by: int | None = Field(default=None, alias="createdBy")
    updated_by: int | None = Field(default=None, alias="updatedBy")

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        return str(value)

    model_config = ConfigDict(populate_by_name=True)


class InterviewPageInfo(BaseModel):
    page: int
    page_size: int = Field(alias="pageSize")
    total: int

    model_config = ConfigDict(populate_by_name=True)


class InterviewPageResponse(BaseModel):
    items: list[InterviewResponse]
    page: InterviewPageInfo


class InterviewHelpfulResponse(BaseModel):
    helpful_count: int = Field(alias="helpfulCount")
    is_helpful: bool = Field(alias="isHelpful")

    model_config = ConfigDict(populate_by_name=True)
