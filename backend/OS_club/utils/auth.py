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

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号不可用",
        )

    return user


async def get_optional_current_user(
    authorization: str | None = Header(
        default=None,
        alias="Authorization",
    ),
    db: AsyncSession = Depends(get_database),
) -> User | None:
    """
    尝试读取当前用户，但没有令牌时不返回 401。

    项目公开列表和详情页需要同时服务游客和登录用户：游客可以查看
    公共项目，登录用户还会额外得到“是否已收藏”状态。
    """

    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    user = await get_user_by_token(db, token.strip())
    return user if user is not None and user.status == "active" else None



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
            detail="只有组长或负责人可以执行此操作",
        )

    return current_user



async def require_content_reviewer(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    判断当前用户是否可以审核项目、资源和面经。

    允许审核的角色：
    CohortLeader：负责人，可以审核自己届次的内容
    Leader：组长，可以审核全部内容
    Admin：旧版管理员角色，按组长处理
    """

    # 账号被禁用或注销时，不能执行审核操作。
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号不可用",
        )

    # 普通成员和组员可以提交内容，
    # 但不能审核其他人的内容。
    if current_user.role not in {
        "CohortLeader",
        "Leader",
        "Admin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有负责人或组长可以审核内容",
        )

    return current_user
