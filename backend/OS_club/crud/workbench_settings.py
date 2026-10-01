"""首页工作台设置的数据库读取和更新操作。"""

from sqlalchemy.ext.asyncio import AsyncSession

from models.workbench_settings import WorkbenchSettings
from schemas.workbench_settings import WorkbenchSettingsUpdateRequest


SETTINGS_ID = 1


async def get_or_create_workbench_settings(db: AsyncSession) -> WorkbenchSettings:
    """读取全站唯一的设置记录；首次访问时创建默认记录。"""

    settings = await db.get(WorkbenchSettings, SETTINGS_ID)
    if settings is None:
        settings = WorkbenchSettings(id=SETTINGS_ID)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


async def update_workbench_settings(
    db: AsyncSession,
    data: WorkbenchSettingsUpdateRequest,
) -> WorkbenchSettings:
    """把前端提交的完整设置保存到全站唯一的那条记录。"""

    settings = await get_or_create_workbench_settings(db)
    changes = data.model_dump()

    # JSON 列需要普通字典和列表；把 Pydantic 子模型转成字典再保存。
    changes["live_items"] = [item.model_dump() for item in data.live_items]

    for field_name, field_value in changes.items():
        setattr(settings, field_name, field_value)

    await db.commit()
    await db.refresh(settings)
    return settings
