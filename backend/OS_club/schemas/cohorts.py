"""
 @File : cohorts.py.py
 @Author : 加个真朋友
@Description :
"""
"""
届次和小组的接口数据模型。
"""

"""
CohortCreateRequest
创建届次时，前端发送给后端的数据

CohortUpdateRequest
修改届次时，前端发送给后端的数据

CohortResponse
后端返回给前端的数据
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CohortBase(BaseModel):
    """
    届次的公共字段。

    创建届次和返回届次时都会用到这些字段。
    """

    # 届次年份，例如 "2029"
    year: str = Field(
        min_length=1,
        max_length=20,
    )

    # Python 使用 generation_label，
    # 前端 JSON 使用 generationLabel。
    generation_label: str = Field(
        default="",
        max_length=100,
        alias="generationLabel",
    )

    # 允许的状态：
    # active   当前进行中的届次
    # archived 已归档的届次
    # draft    草稿届次
    status: str = Field(
        default="draft",
        pattern="^(active|archived|draft)$",
    )

    # 届次介绍。
    description: str = ""

    # 允许使用 Python 字段名或前端字段别名。
    model_config = ConfigDict(
        populate_by_name=True,
    )


class CohortCreateRequest(CohortBase):
    """
    创建届次时接收的数据。

    目前创建届次至少需要 year。
    """
    pass


class CohortUpdateRequest(BaseModel):
    """
    修改届次时接收的数据。

    所有字段都可以不传，只修改需要修改的内容。
    """

    year: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )

    generation_label: str | None = Field(
        default=None,
        max_length=100,
        alias="generationLabel",
    )

    status: str | None = Field(
        default=None,
        pattern="^(active|archived|draft)$",
    )

    description: str | None = None

    model_config = ConfigDict(
        populate_by_name=True,
    )


class CohortTeamBase(BaseModel):
    """
    小组的公共字段。
    """

    # 小组名称，例如“算法组”
    name: str = Field(
        min_length=1,
        max_length=50,
    )

    # 小组介绍
    description: str = ""

    # 前端显示颜色，例如 blue、violet、rose
    accent: str = Field(
        default="blue",
        max_length=20,
    )

    # 小组人数上限。
    # 不传表示暂时不限制人数。
    member_capacity: int | None = Field(
        default=None,
        alias="memberCapacity",
        ge=1,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class CohortTeamCreateRequest(CohortTeamBase):
    """
    创建小组时接收的数据。
    """
    pass


class CohortTeamUpdateRequest(BaseModel):
    """
    修改小组时接收的数据。
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    description: str | None = None

    accent: str | None = Field(
        default=None,
        max_length=20,
    )

    member_capacity: int | None = Field(
        default=None,
        alias="memberCapacity",
        ge=1,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class CohortTeamResponse(CohortTeamBase):
    """
    返回给前端的小组数据。
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: int

    # 成员模块还没有完成。
    # 现在先返回空列表，后面再接入真实成员数据。
    members: list[dict] = Field(
        default_factory=list,
    )

    created_at: datetime = Field(
        alias="createdAt",
    )

    updated_at: datetime = Field(
        alias="updatedAt",
    )


class CohortResponse(CohortBase):
    """
    返回给前端的届次数据。
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: int

    # 一个届次可以包含多个小组。
    teams: list[CohortTeamResponse] = Field(
        default_factory=list,
    )

    created_at: datetime = Field(
        alias="createdAt",
    )

    updated_at: datetime = Field(
        alias="updatedAt",
    )
