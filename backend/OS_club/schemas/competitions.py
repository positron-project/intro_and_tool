"""比赛中心接口的数据校验规则和返回格式。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# 这些值与前端 CompetitionStatus / CompetitionLifecycle 保持一致。
CompetitionStatus = Literal[
    "草稿",
    "即将报名",
    "报名中",
    "报名已截止",
    "即将开始",
    "比赛进行中",
    "等待结果",
    "已结束",
]
CompetitionLifecycle = Literal["draft", "published", "archived"]
CompetitionVisibility = Literal["public", "members", "contributors"]


def _reject_whitespace_only(value: str) -> str:
    """拒绝只包含空格的必填文字；普通 min_length 检查不会把空格当空值。"""

    if not value.strip():
        raise ValueError("内容不能为空或仅包含空格")
    return value


class CompetitionTrackData(BaseModel):
    """单个比赛赛道的字段；JSON 字段名与前端 CompetitionTrack 保持一致。"""

    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=5000)
    audience: str | None = Field(default=None, max_length=1000)
    format: str | None = Field(default=None, max_length=80)
    team_size: str | None = Field(default=None, max_length=200, alias="teamSize")
    requirements: str | None = Field(default=None, max_length=5000)
    registration_start: str | None = Field(default=None, max_length=100, alias="registrationStart")
    registration_end: str | None = Field(default=None, max_length=100, alias="registrationEnd")
    registration_url: str | None = Field(default=None, max_length=2048, alias="registrationUrl")
    rules_url: str | None = Field(default=None, max_length=2048, alias="rulesUrl")
    awards: str | None = Field(default=None, max_length=2000)

    @field_validator("id", "name")
    @classmethod
    def required_track_text_must_contain_non_space(cls, value: str) -> str:
        """赛道 ID 和名称必须有实际文字，不能只由空格组成。"""

        return _reject_whitespace_only(value)

    model_config = ConfigDict(populate_by_name=True)


class CompetitionCreateRequest(BaseModel):
    """创建赛事时前端可以提交的字段。"""

    title: str = Field(min_length=1, max_length=150)
    series_name: str | None = Field(default=None, max_length=150, alias="seriesName")
    type: str = Field(default="其他", min_length=1, max_length=80)
    organizer: str | None = Field(default=None, max_length=150)
    official_url: str | None = Field(default=None, max_length=500, alias="officialUrl")

    # 日期先以字符串存储，因为前端输入可能是 date-time，也兼容旧的日期文字。
    registration_start: str | None = Field(default=None, max_length=100, alias="registrationStart")
    registration_end: str | None = Field(default=None, max_length=100, alias="registrationEnd")
    event_start: str | None = Field(default=None, max_length=100, alias="eventStart")
    event_end: str | None = Field(default=None, max_length=100, alias="eventEnd")
    result_date: str | None = Field(default=None, max_length=100, alias="resultDate")

    lifecycle: CompetitionLifecycle = "draft"

    # date/deadline 是旧版前端字段；创建时会与 eventStart/registrationEnd 互相补齐。
    date: str = Field(default="", max_length=100)
    deadline: str = Field(default="", max_length=100)
    description: str = Field(min_length=1, max_length=10000)
    status: CompetitionStatus = "草稿"
    accent: str = Field(default="blue", max_length=30)
    visibility: CompetitionVisibility = "members"
    tracks: list[CompetitionTrackData] = Field(default_factory=list)

    # 接收 camelCase JSON，同时允许 Python 代码使用 snake_case 字段名。
    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title", "type", "description")
    @classmethod
    def required_text_must_contain_non_space(cls, value: str) -> str:
        """字符串长度校验之外，再确认必填内容不是纯空白。"""

        return _reject_whitespace_only(value)


class CompetitionUpdateRequest(BaseModel):
    """修改赛事时使用；只会更新请求中出现的字段。"""

    title: str | None = Field(default=None, min_length=1, max_length=150)
    series_name: str | None = Field(default=None, max_length=150, alias="seriesName")
    type: str | None = Field(default=None, min_length=1, max_length=80)
    organizer: str | None = Field(default=None, max_length=150)
    official_url: str | None = Field(default=None, max_length=500, alias="officialUrl")
    registration_start: str | None = Field(default=None, max_length=100, alias="registrationStart")
    registration_end: str | None = Field(default=None, max_length=100, alias="registrationEnd")
    event_start: str | None = Field(default=None, max_length=100, alias="eventStart")
    event_end: str | None = Field(default=None, max_length=100, alias="eventEnd")
    result_date: str | None = Field(default=None, max_length=100, alias="resultDate")
    lifecycle: CompetitionLifecycle | None = None
    date: str | None = Field(default=None, max_length=100)
    deadline: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=10000)
    status: CompetitionStatus | None = None
    accent: str | None = Field(default=None, max_length=30)
    visibility: CompetitionVisibility | None = None
    # PATCH 中不传 tracks 表示不改；传 [] 表示清空所有赛道。
    tracks: list[CompetitionTrackData] | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title", "type", "description")
    @classmethod
    def provided_text_must_contain_non_space(cls, value: str | None) -> str | None:
        """PATCH 没有提交这些字段时不检查；提交非空内容时拒绝纯空白。"""

        return _reject_whitespace_only(value) if value is not None else None


class CompetitionProjectCreateRequest(BaseModel):
    """创建比赛详情里的往届成果。"""

    title: str = Field(min_length=1, max_length=150)
    cohort: str = Field(min_length=1, max_length=30)
    cohort_id: int | None = Field(default=None, alias="cohortId")
    description: str = Field(default="", max_length=10000)
    image_url: str | None = Field(default=None, max_length=500, alias="imageUrl")
    image_asset_id: str | None = Field(default=None, max_length=100, alias="imageAssetId")
    project_url: str | None = Field(default=None, max_length=500, alias="projectUrl")
    sort_order: int = Field(default=0, ge=0, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title", "cohort")
    @classmethod
    def required_text_must_contain_non_space(cls, value: str) -> str:
        """成果标题和届次名去掉空格后必须仍有内容。"""

        return _reject_whitespace_only(value)


class CompetitionProjectUpdateRequest(BaseModel):
    """局部修改往届成果；未发送的字段保持原值。"""

    title: str | None = Field(default=None, min_length=1, max_length=150)
    cohort: str | None = Field(default=None, min_length=1, max_length=30)
    cohort_id: int | None = Field(default=None, alias="cohortId")
    description: str | None = Field(default=None, max_length=10000)
    image_url: str | None = Field(default=None, max_length=500, alias="imageUrl")
    image_asset_id: str | None = Field(default=None, max_length=100, alias="imageAssetId")
    project_url: str | None = Field(default=None, max_length=500, alias="projectUrl")
    sort_order: int | None = Field(default=None, ge=0, alias="sortOrder")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("title", "cohort")
    @classmethod
    def provided_text_must_contain_non_space(cls, value: str | None) -> str | None:
        """PATCH 中省略字段代表“不修改”；传入空白则作为无效值拒绝。"""

        return _reject_whitespace_only(value) if value is not None else None


class CompetitionProjectResponse(BaseModel):
    """比赛往届成果响应；数据库整数 ID 对前端统一输出字符串。"""

    id: str
    title: str
    cohort: str
    cohort_id: str | None = Field(default=None, alias="cohortId")
    description: str
    image_url: str | None = Field(default=None, alias="imageUrl")
    image_asset_id: str | None = Field(default=None, alias="imageAssetId")
    project_url: str | None = Field(default=None, alias="projectUrl")
    sort_order: int = Field(alias="sortOrder")

    @field_validator("id", "cohort_id", mode="before")
    @classmethod
    def convert_ids_to_strings(cls, value: int | str | None) -> str | None:
        """把数据库 ID 变成字符串，避免前端的严格相等判断出错。"""

        return str(value) if value is not None else None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CompetitionResponse(BaseModel):
    """比赛详情响应，字段名称遵循前端 camelCase 类型定义。"""

    id: str
    title: str
    series_name: str | None = Field(default=None, alias="seriesName")
    type: str
    organizer: str | None = None
    official_url: str | None = Field(default=None, alias="officialUrl")
    registration_start: str | None = Field(default=None, alias="registrationStart")
    registration_end: str | None = Field(default=None, alias="registrationEnd")
    event_start: str | None = Field(default=None, alias="eventStart")
    event_end: str | None = Field(default=None, alias="eventEnd")
    result_date: str | None = Field(default=None, alias="resultDate")
    lifecycle: CompetitionLifecycle
    date: str
    deadline: str
    description: str
    status: CompetitionStatus
    accent: str
    visibility: CompetitionVisibility
    tracks: list[CompetitionTrackData] = Field(default_factory=list)
    projects: list[CompetitionProjectResponse] = Field(default_factory=list)

    # 以下是服务端维护的审计时间和操作者，创建/编辑请求不能伪造它们。
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    created_by: str | None = Field(default=None, alias="createdBy")
    updated_by: str | None = Field(default=None, alias="updatedBy")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    archived_at: datetime | None = Field(default=None, alias="archivedAt")

    @field_validator("id", "created_by", "updated_by", mode="before")
    @classmethod
    def convert_ids_to_strings(cls, value: int | str | None) -> str | None:
        return str(value) if value is not None else None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CompetitionReminderRequest(BaseModel):
    """提醒按钮提交的开关值。"""

    enabled: bool


class CompetitionReminderResponse(BaseModel):
    """返回当前用户对一场比赛的提醒设置。"""

    competition_id: str = Field(alias="competitionId")
    enabled: bool
    created_at: datetime | None = Field(default=None, alias="createdAt")

    @field_validator("competition_id", mode="before")
    @classmethod
    def convert_competition_id_to_string(cls, value: int | str) -> str:
        return str(value)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
