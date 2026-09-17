"""
 @File : users.py
 @Author : 加个真朋友
@Description : 如何验证并修改数据库
"""
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.users import User, UserToken
from utils.security import hash_password, verify_password
from schemas.users import ProfileUpdateRequest


async def get_user_by_email(    #据邮箱查询用户的数据库
    db: AsyncSession,
    email: str,
) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email)
    )

    return result.scalar_one_or_none()



async def create_login_token(
    db: AsyncSession,
    user_id: int,
) -> str:
    token_value = str(uuid.uuid4()) #生成随机登录令牌。

    expires_at = datetime.now() + timedelta(days=7) #设置过期时间为当前时间之后 7 天。

    result = await db.execute(
        select(UserToken).where(
            UserToken.user_id == user_id
        )
    )

    user_token = result.scalar_one_or_none()

    if user_token:
        user_token.token = token_value
        user_token.expires_at = expires_at
    else:
        user_token = UserToken(
            user_id=user_id,
            token=token_value,
            expires_at=expires_at,
        )
        db.add(user_token)

    await db.commit() #把 Token 真正保存到数据库。

    return token_value



async def authenticate_user( # 验证用户
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    email = email.lower()

    user = await get_user_by_email(db, email)

    if user is None:
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None
    return user




async def get_user_by_token(
    db: AsyncSession,
    token: str,
) -> User | None:
    result = await db.execute(
        select(UserToken).where(
            UserToken.token == token
        )
    )

    user_token = result.scalar_one_or_none()

    if user_token is None:
        return None

    if user_token.expires_at <= datetime.now():
        return None

    result = await db.execute(
        select(User).where(
            User.id == user_token.user_id
        )
    )

    user = result.scalar_one_or_none()

    # 即使旧令牌还没有过期，账号被禁用或注销后也不能继续使用。
    if user is None or user.status != "active":
        return None

    return user





async def revoke_login_token(
    db: AsyncSession,
    token: str,
) -> bool:
    result = await db.execute(
        select(UserToken).where(
            UserToken.token == token
        )
    )

    user_token = result.scalar_one_or_none()

    if user_token is None:
        return False

    await db.delete(user_token)
    await db.commit()

    return True




async def change_password( #修改密码
    db: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> bool:
    if not verify_password(         #验证旧密码
        current_password,
        user.password_hash,
    ):
        return False

    user.password_hash = hash_password(new_password) #生成新密码哈希

    await db.commit()
    await db.refresh(user)  #修改数据库

    return True




async def update_user_profile(
    db: AsyncSession,
    user: User,
    profile_data: ProfileUpdateRequest,
) -> User:
    update_values = profile_data.model_dump( #把请求模型转换成字典，并且只保留前端真正提交的字段。
        exclude_unset=True,
    )

    for field_name, field_value in update_values.items():
        setattr(user, field_name, field_value)

    if update_values:
        await db.commit()
        await db.refresh(user)

    return user
