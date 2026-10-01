"""首页工作台展示设置接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.workbench_settings import get_or_create_workbench_settings, update_workbench_settings
from models.users import User
from schemas.workbench_settings import WorkbenchSettingsResponse, WorkbenchSettingsUpdateRequest
from utils.auth import require_leader_or_admin


router = APIRouter(prefix="/api/workbench-settings", tags=["workbench-settings"])


@router.get("", response_model=WorkbenchSettingsResponse)
async def get_workbench_settings(db: AsyncSession = Depends(get_database)):
    """公开读取首页展示设置，保证游客打开首页时也能得到配置。"""

    return await get_or_create_workbench_settings(db)


@router.patch("", response_model=WorkbenchSettingsResponse)
async def edit_workbench_settings(
    data: WorkbenchSettingsUpdateRequest,
    db: AsyncSession = Depends(get_database),
    current_user: User = Depends(require_leader_or_admin),
):
    """仅组长或兼容旧版管理员可以修改全站共用的工作台设置。"""

    return await update_workbench_settings(db, data)
