"""
 @File : projects.py.py
 @Author : 加个真朋友
@Description :
"""
"""
项目接口数据模型。
"""

from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class ProjectMilestone(BaseModel):
    """
    项目里程碑。
    """

    id: str
    year: str
    title: str
    summary: str
    status: str | None = None


class ProjectLog(BaseModel):
    """
    项目开发日志。
    """

    id: str
    date: str
    title: str
    detail: str
    author: str | None = None
    author_initials: str | None = Field(
        default=None,
        alias="authorInitials",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ProjectBase(BaseModel):
    """
    项目公共字段。
    """

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    slug: str = Field(
        min_length=1,
        max_length=150,
    )

    description: str = Field(
        min_length=1,
    )

    intro: str | None = None

    github_url: str | None = Field(
        default=None,
        alias="githubUrl",
    )

    docs_url: str | None = Field(
        default=None,
        alias="docsUrl",
    )

    demo_url: str | None = Field(
        default=None,
        alias="demoUrl",
    )

    issue_url: str | None = Field(
        default=None,
        alias="issueUrl",
    )

    download_url: str | None = Field(
        default=None,
        alias="downloadUrl",
    )

    cover_image: str | None = Field(
        default=None,
        alias="coverImage",
    )

    gallery_images: list[str] = Field(
        default_factory=list,
        alias="galleryImages",
    )

    stack: list[str] = Field(
        default_factory=list,
    )

    # Python 中叫 member_count，
    # 前端 JSON 中仍然使用 members。
    member_count: int = Field(
        default=0,
        alias="members",
        ge=0,
    )

    stars: int = Field(
        default=0,
        ge=0,
    )

    status: Literal[
        "招募中",
        "维护中",
        "已归档",
    ] = "维护中"

    difficulty: int = Field(
        default=1,
        ge=1,
        le=5,
    )

    year: int = Field(
        ge=2000,
        le=2100,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    accent: str = "blue"

    icon: str = "rocket"

    featured: bool = False

    visibility: Literal[
        "public",
        "members",
        "contributors",
    ] = "public"

    milestones: list[ProjectMilestone] = Field(
        default_factory=list,
    )

    logs: list[ProjectLog] = Field(
        default_factory=list,
    )

    member_ids: list[str] = Field(
        default_factory=list,
        alias="memberIds",
    )

    join_enabled: bool = Field(
        default=False,
        alias="joinEnabled",
    )

    join_note: str | None = Field(
        default=None,
        alias="joinNote",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ProjectCreateRequest(ProjectBase):
    """
    创建项目时接收的数据。
    """


class ProjectUpdateRequest(BaseModel):
    """
    修改项目时接收的数据。

    所有字段都可以不提交，
    只修改真正传过来的字段。
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    description: str | None = None
    intro: str | None = None

    github_url: str | None = Field(
        default=None,
        alias="githubUrl",
    )

    docs_url: str | None = Field(
        default=None,
        alias="docsUrl",
    )

    demo_url: str | None = Field(
        default=None,
        alias="demoUrl",
    )

    issue_url: str | None = Field(
        default=None,
        alias="issueUrl",
    )

    download_url: str | None = Field(
        default=None,
        alias="downloadUrl",
    )

    cover_image: str | None = Field(
        default=None,
        alias="coverImage",
    )

    gallery_images: list[str] | None = Field(
        default=None,
        alias="galleryImages",
    )

    stack: list[str] | None = None
    member_count: int | None = Field(
        default=None,
        alias="members",
        ge=0,
    )
    stars: int | None = Field(
        default=None,
        ge=0,
    )
    status: Literal[
        "招募中",
        "维护中",
        "已归档",
    ] | None = None

    difficulty: int | None = Field(
        default=None,
        ge=1,
        le=5,
    )

    year: int | None = Field(
        default=None,
        ge=2000,
        le=2100,
    )

    category: str | None = None
    accent: str | None = None
    icon: str | None = None
    featured: bool | None = None

    visibility: Literal[
        "public",
        "members",
        "contributors",
    ] | None = None

    milestones: list[ProjectMilestone] | None = None
    logs: list[ProjectLog] | None = None

    member_ids: list[str] | None = Field(
        default=None,
        alias="memberIds",
    )

    join_enabled: bool | None = Field(
        default=None,
        alias="joinEnabled",
    )

    join_note: str | None = Field(
        default=None,
        alias="joinNote",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class ProjectResponse(ProjectBase):
    """
    返回给前端的项目数据。
    """

    id: str

    # 项目详情页被查看的次数，只能由浏览接口维护，
    # 不允许创建项目的请求伪造这个统计值。
    views: int = Field(
        default=0,
        ge=0,
    )

    # 收藏统计由 favorites 表计算，不能由前端提交。
    favorite_count: int | None = Field(
        default=None,
        alias="favoriteCount",
        ge=0,
    )

    # 游客默认为 false，登录用户由项目路由补充真实状态。
    is_favorited: bool = Field(
        default=False,
        alias="isFavorited",
    )

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, value: int | str) -> str:
        """把数据库中的整数编号转换成前端使用的字符串。"""

        return str(value)

    # 审核状态。
    review_status: Literal[
        "pending",
        "approved",
        "rejected",
    ] = Field(
        default="pending",
        alias="reviewStatus",
    )

    # 审核意见。
    review_note: str | None = Field(
        default=None,
        alias="reviewNote",
    )

    # 提交人账号编号。
    submitted_by: int | None = Field(
        default=None,
        alias="submittedBy",
    )

    # 提交人的公开显示名称，不返回邮箱等敏感账号信息。
    submitted_by_name: str | None = Field(
        default=None,
        alias="submittedByName",
    )

    # 提交人的方向，没有分配方向时返回“未分配方向”。
    submitted_by_direction: str | None = Field(
        default=None,
        alias="submittedByDirection",
    )

    # 审核人账号编号。
    reviewed_by: int | None = Field(
        default=None,
        alias="reviewedBy",
    )

    # 审核时间。
    reviewed_at: datetime | None = Field(
        default=None,
        alias="reviewedAt",
    )

    created_at: datetime | None = Field(
        default=None,
        alias="createdAt",
    )

    updated_at: datetime | None = Field(
        default=None,
        alias="updatedAt",
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

class ProjectReviewRequest(BaseModel):
    """
    审核项目时接收的数据。

    普通用户不能提交这个模型，
    只有负责人或组长可以调用审核接口。
    """

    review_status: Literal[
        "approved",
        "rejected",
    ] = Field(
        alias="reviewStatus",
    )

    review_note: str | None = Field(
        default=None,
        alias="reviewNote",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )
