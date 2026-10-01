"""
 @File : members.py.py
 @Author : 加个真朋友
@Description :
"""
"""
成员目录接口数据模型。
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemberBase(BaseModel):
    """
    成员资料的公共字段。
    """

    # 前台展示姓名
    name: str = Field(
        min_length=1,
        max_length=50,
    )

    # 小组中的展示职务，不是账号权限。
    # 例如：组员、负责人、组长。
    role: str = Field(
        default="组员",
        max_length=20,
    )

    # 前端使用“2029”或“2029 届”。
    cohort: str = Field(
        default="待分配",
        max_length=20,
    )

    # 例如：算法组、项目组、网安组。
    direction: str = Field(
        default="待补充",
        max_length=50,
    )

    # 头像上显示的缩写。
    initials: str | None = Field(
        default=None,
        max_length=10,
    )

    # 头像背景颜色。
    accent: str = Field(
        default="blue",
        max_length=20,
    )

    # 头像地址。
    avatar_url: str | None = Field(
        default=None,
        alias="avatarUrl",
        max_length=255,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class MemberCreateRequest(MemberBase):
    """
    添加成员时接收的数据。
    """

    # 可选：如果成员拥有登录账号，可以关联账号名称。
    username: str | None = Field(
        default=None,
        max_length=32,
    )


class MemberUpdateRequest(BaseModel):
    """
    修改成员时接收的数据。

    所有字段都是可选的，只修改提交的字段。
    """

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    role: str | None = Field(
        default=None,
        max_length=20,
    )

    cohort: str | None = Field(
        default=None,
        max_length=20,
    )

    direction: str | None = Field(
        default=None,
        max_length=50,
    )

    initials: str | None = Field(
        default=None,
        max_length=10,
    )

    accent: str | None = Field(
        default=None,
        max_length=20,
    )

    avatar_url: str | None = Field(
        default=None,
        alias="avatarUrl",
        max_length=255,
    )

    status: str | None = Field(
        default=None,
        pattern="^(active|hidden)$",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class MemberResponse(MemberBase):
    """
    返回给前端的成员资料。
    """

    id: str

    # 如果成员档案关联了登录账号，返回 users.id，
    # 让前端可以正确显示邮箱并合并同一个账号的两条资料。
    user_id: int | None = Field(
        default=None,
        alias="userId",
    )

    username: str | None = None

    # 当前还没有项目关联表，所以先返回空列表。
    projects: list[str] = Field(
        default_factory=list,
    )

    # 成员展示状态。
    status: str = "active"

    created_at: datetime | None = Field(
        default=None,
        alias="createdAt",
    )

    updated_at: datetime | None = Field(
        default=None,
        alias="updatedAt",
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class MemberImportResult(BaseModel):
    """
    批量导入成员后的结果。
    """

    imported: int
    skipped: int
    errors: list[str] = Field(
        default_factory=list,
    )
