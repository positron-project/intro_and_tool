"""全站站点设置接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.site_settings import get_or_create_site_settings, update_site_settings
from models.users import User
from schemas.site_settings import SiteSettingsResponse, SiteSettingsUpdateRequest
from utils.auth import require_leader_or_admin


router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/site", response_model=SiteSettingsResponse)
async def get_site_settings(db: AsyncSession = Depends(get_database)):
    """公开读取全站外观默认值。"""

    return await get_or_create_site_settings(db)


@router.patch("/site", response_model=SiteSettingsResponse)
async def edit_site_settings(
    data: SiteSettingsUpdateRequest,
    db: AsyncSession = Depends(get_database),
    current_user: User = Depends(require_leader_or_admin),
):
    """仅组长或兼容旧版管理员可以修改全站设置。"""

    return await update_site_settings(
        db,
        data,
        actor_id=current_user.id,
        actor_name=current_user.nickname or current_user.username,
    )
