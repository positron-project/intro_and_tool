"""项目、资源和面经分类接口。"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.content_categories import (
    create_category,
    delete_category,
    get_category_by_id,
    list_categories,
    update_category,
)
from models.users import User
from schemas.content_categories import (
    ContentCategoryCreateRequest,
    ContentCategoryResponse,
    ContentCategoryUpdateRequest,
)
from utils.auth import require_leader_or_admin


router = APIRouter(
    prefix="/api/categories",
    tags=["categories"],
)


@router.get(
    "",
    response_model=list[ContentCategoryResponse],
)
async def get_categories(
    resource: str = Query(...),
    db: AsyncSession = Depends(get_database),
):
    """获取指定模块的全部分类配置。"""

    if resource not in {"projects", "resources", "interviews"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类模块不正确",
        )

    return await list_categories(db, resource)


@router.post(
    "",
    response_model=ContentCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_category(
    category_data: ContentCategoryCreateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或旧管理员创建自定义分类。"""

    try:
        return await create_category(db, category_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.patch(
    "/{category_id}",
    response_model=ContentCategoryResponse,
)
async def edit_category(
    category_id: int,
    category_data: ContentCategoryUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或旧管理员修改分类。"""

    try:
        category = await update_category(db, category_id, category_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )

    return category


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_category(
    category_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或旧管理员删除未使用的自定义分类。"""

    try:
        deleted = await delete_category(db, category_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
