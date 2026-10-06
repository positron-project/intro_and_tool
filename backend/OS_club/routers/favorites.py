"""内容收藏接口。"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.favorites import (
    add_favorite,
    list_user_favorites,
    remove_favorite,
)
from models.users import User
from schemas.favorites import FavoriteCreateRequest, FavoriteResponse
from utils.auth import get_current_user


router = APIRouter(
    prefix="/api/favorites",
    tags=["favorites"],
)


@router.get(
    "",
    response_model=list[FavoriteResponse],
)
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """返回当前登录用户的收藏列表。"""

    return await list_user_favorites(db, current_user.id)


@router.post(
    "",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_favorite(
    favorite_data: FavoriteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """收藏一个项目、资源或面经。"""

    try:
        return await add_favorite(
            db=db,
            user=current_user,
            target_type=favorite_data.target_type,
            target_id=favorite_data.target_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.delete(
    "/{target_type}/{target_id}",
    response_model=FavoriteResponse,
)
async def delete_favorite(
    target_type: str,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """取消当前用户对一个内容的收藏。"""

    try:
        return await remove_favorite(
            db=db,
            user=current_user,
            target_type=target_type,
            target_id=target_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
