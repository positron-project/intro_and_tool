"""当前登录账号个人偏好接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.user_preferences import get_user_preferences, update_user_preferences
from models.users import User
from schemas.user_preferences import UserPreferencesResponse, UserPreferencesUpdateRequest
from utils.auth import get_current_user


router = APIRouter(
    prefix="/api/users/me/preferences",
    tags=["user-preferences"],
)


@router.get("", response_model=UserPreferencesResponse)
async def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """只读取令牌对应的账号偏好。"""

    return await get_user_preferences(db, current_user.id)


@router.patch("", response_model=UserPreferencesResponse)
async def edit_my_preferences(
    data: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """只更新当前登录账号自己的偏好设置。"""

    result = await update_user_preferences(db, current_user.id, data)
    if result is None:
        return await get_user_preferences(db, current_user.id)
    return result
