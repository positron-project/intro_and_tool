"""
 @File : auth.py
 @Author : 加个真朋友
@Description : 
"""
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.users import get_user_by_token
from models.users import User



async def get_current_user(
    authorization: str | None = Header(
        default=None,
        alias="Authorization",
    ),
    db: AsyncSession = Depends(get_database),
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录令牌格式错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_token(
        db,
        token.strip(),
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录令牌无效或已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user



async def require_leader_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    判断当前登录用户是否具有管理员权限。

    get_current_user 只负责确认：
    这个人有没有登录。

    require_leader_or_admin 继续确认：
    这个人是不是组长或管理员。
    """

    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号不可用",
        )

    if current_user.role not in {"Leader", "Admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有组长或管理员可以执行此操作",
        )

    return current_user