"""
 @File : users.py.py
 @Author : 加个真朋友
@Description : 管用户资料相关的接口（查资料、改资料）
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class UserInfoBase(BaseModel):
    """用户资料中可复用的字段。"""

    nickname: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        alias="name",
    )

    avatar_url: str | None = Field(
        default=None,
        max_length=255,
        alias="avatarUrl",
    )

    bio: str | None = Field(
        default=None,
        max_length=500,
    )
"""
**公共基类**，把「用户可编辑的资料字段」抽出来复用，后面修改资料、返回用户信息都会继承它，避免重复写代码
"""




"""修改资料时接收昵称、头像、简介"""
"""修改资料只能改「昵称、头像、简介」这三个字段"""
class ProfileUpdateRequest(UserInfoBase):
    pass



"""返回用户信息"""
class UserInfoResponse(UserInfoBase):  #UserInfoResponse：只用于返回用户数据；
    model_config = ConfigDict(from_attributes=True,
                              populate_by_name=True,)

    id: int
    username: str
    email: str
    # 用户角色：Member（普通成员）、Contributor（组员）、
    # CohortLeader（届次负责人）、Leader（组长）、Admin（旧版组长别名）
    role: str

    # 账号状态，例如 active、disabled、closed
    status: str

    # 所属届次，例如 2029；未分配时为空
    cohort: str | None = None
    direction: str | None = None
    created_at: datetime
