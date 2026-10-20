"""
 @File : users.py
 @Author : 加个真朋友
@Description : 如何验证并修改数据库
"""
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.members import Member
from models.users import User, UserToken
from utils.security import hash_password, verify_password
from schemas.users import ProfileUpdateRequest
from utils.uploads import delete_upload_if_unused


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
) -> tuple[str, datetime]:
    token_value = str(uuid.uuid4()) #生成随机登录令牌。

    expires_at = datetime.now() + timedelta(days=3) #记住登录状态默认保留 3 天。

    result = await db.execute(
        select(UserToken).where(
            UserToken.user_id == user_id
        )
    )

    user_token = result.scalar_one_or_none()        #查到就返回这条 ORM 对象，查不到就返回 None

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

    return token_value, expires_at



async def authenticate_user( # 验证用户 用于密码登入 验证通过就返回用户对象 验证失败就返回
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    email = email.lower()

    user = await get_user_by_email(db, email)

    if user is None:    #数据库里查不到这个邮箱，直接返回 `None`，验证失败
        return None

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None
    return user




async def get_user_by_token( # 登入后的权限验证 比如去访问「个人资料」「修改信息」这类需要登录权限的接口
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





async def revoke_login_token(   # 退出登录    从数据库中删除指定的令牌记录
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
    old_avatar = user.avatar_url if "avatar_url" in update_values else None

    for field_name, field_value in update_values.items():
        setattr(user, field_name, field_value)

    # 成员目录保存公开资料；账号修改姓名或头像时同步更新已关联的成员档案。
    if "nickname" in update_values or "avatar_url" in update_values:
        result = await db.execute(
            select(Member).where(Member.user_id == user.id)
        )
        member = result.scalar_one_or_none()
        if member is not None:
            if "nickname" in update_values:
                member.name = (user.nickname or user.username).strip()
                member.initials = member.name[-2:]
            if "avatar_url" in update_values:
                member.avatar_url = user.avatar_url

    if update_values:
        await db.commit()
        await db.refresh(user)
        await delete_upload_if_unused(db, old_avatar)

    return user


async def close_user_account(
    db: AsyncSession,
    user: User,
) -> None:
    """
    注销当前账号。

    注销采用软删除：保留账号记录，改为 closed 状态，方便管理员
    保留历史数据；同时删除当前账号的登录令牌，立即结束登录会话。
    """

    user.status = "closed"

    result = await db.execute(
        select(UserToken).where(
            UserToken.user_id == user.id
        )
    )

    for user_token in result.scalars().all():
        await db.delete(user_token)

    await db.commit()
