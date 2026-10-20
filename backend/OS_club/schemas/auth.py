"""
 @File : auth.py
 @Author : 加个真朋友
@Description : 接收数据 管理认证相关的接口
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from schemas.email import SupportedRegistrationEmail
from schemas.users import UserInfoResponse



class EmailCodeSendRequest(BaseModel):
    """前端请求发送邮箱验证码时提交的数据。"""

    email: EmailStr

    turnstile_token: str = Field(
        alias="turnstileToken",
        min_length=1,
    )


class RegistrationEmailCodeSendRequest(BaseModel):
    """新账号注册时发送验证码，只接受指定邮箱域名。"""

    email: SupportedRegistrationEmail

    turnstile_token: str = Field(
        alias="turnstileToken",
        min_length=1,
    )


class LoginRequest(BaseModel): #前端提交邮箱、密码和人机验证凭证
    email: EmailStr #检查邮箱格式

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    # 这个值由浏览器完成 Turnstile 后取得，但不能只信任浏览器的结果。
    # 登录路由会再用后端密钥向 Cloudflare 核验它；缺失时请求会在进入路由前被拒绝。
    turnstile_token: str = Field(
        alias="turnstileToken",
        min_length=1,
    )

    remember_me: bool = Field(default=True, alias="rememberMe")

class LoginCodeRequest(BaseModel):
    """邮箱验证码登录接口接收的数据。"""

    email: EmailStr

    verification_code: str = Field(
        alias="verificationCode",
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",  #正则校验，必须是纯数字，字母、符号都不通过
    )

    turnstile_token: str = Field(
        alias="turnstileToken",
        min_length=1,
    )

    remember_me: bool = Field(default=True, alias="rememberMe")

class LoginResponse(BaseModel): #后端返回 Token 和用户信息
    access_token: str = Field(
        alias="accessToken",
    )

    expires_at: datetime | None = Field(default=None, alias="expiresAt")
    user: UserInfoResponse

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )



class PasswordChangeRequest(BaseModel): #这里只负责检查数据格式
    current_password: str = Field(
        min_length=8,
        max_length=128,
        alias="currentPassword"
    )

    new_password: str = Field(
        min_length=8,
        max_length=128,
        alias="newPassword"
    )

