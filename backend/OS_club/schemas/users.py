"""
 @File : users.py.py
 @Author : 加个真朋友
@Description : 
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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




"""注册时接收用户名、邮箱、密码"""
class RegisterRequest(BaseModel):    #UserCreate：只用于接收注册数据；
    """注册接口接收的账号、邮箱和密码。"""

    username: str = Field(  #username：注册用户名，长度限制为 2 到 32 个字符；
        min_length=2,
        max_length=32,
    )

    email: EmailStr #email：EmailStr 会检查邮箱格式；

    verification_code: str = Field(
        alias="verificationCode",
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",
    )

    password: str = Field(  #password：接收用户输入的密码，长度限制为 8 到 128 个字符；
        min_length=8,
        max_length=128,
    )

    turnstile_token: str = Field(
        alias="turnstileToken",
        min_length=1,
    )

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
