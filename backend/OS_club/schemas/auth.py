"""
 @File : auth.py
 @Author : 加个真朋友
@Description : 接收数据
"""
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from schemas.users import UserInfoResponse



class LoginRequest(BaseModel): #前端提交邮箱和密码
    email: EmailStr #检查邮箱格式

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    turnstile_token: str = Field(alias="turnstileToken", min_length=1)

    remember_me: bool = Field(default=True, alias="rememberMe")

    model_config = ConfigDict(populate_by_name=True)


class EmailCodeSendRequest(BaseModel):
    email: EmailStr
    turnstile_token: str = Field(alias="turnstileToken", min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class LoginCodeRequest(BaseModel):
    email: EmailStr
    verification_code: str = Field(
        alias="verificationCode",
        pattern=r"^[0-9]{6}$",
    )
    turnstile_token: str = Field(alias="turnstileToken", min_length=1)
    remember_me: bool = Field(default=True, alias="rememberMe")

    model_config = ConfigDict(populate_by_name=True)


class RegistrationCodeResult(BaseModel):
    expires_in_seconds: int = Field(alias="expiresInSeconds")

    model_config = ConfigDict(populate_by_name=True)


class LoginResponse(BaseModel): #后端返回 Token 和用户信息
    access_token: str = Field(
        alias="accessToken",
    )

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

