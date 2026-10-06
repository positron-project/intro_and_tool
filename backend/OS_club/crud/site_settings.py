"""全站站点设置的数据库读取和更新操作。"""

from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from models.site_settings import SiteSettings
from schemas.site_settings import SiteSettingsUpdateRequest
from utils.uploads import delete_upload_if_unused


SETTINGS_ID = 1


async def get_or_create_site_settings(db: AsyncSession) -> SiteSettings:
    """读取站点唯一设置；数据库中没有时创建默认记录。"""

    settings = await db.get(SiteSettings, SETTINGS_ID)
    if settings is None:
        settings = SiteSettings(id=SETTINGS_ID)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)

    return settings


async def update_site_settings(
    db: AsyncSession,
    data: SiteSettingsUpdateRequest,
    actor_id: int,
    actor_name: str,
) -> SiteSettings:
    """只更新请求中出现的字段，其他全站设置保持原样。"""

    settings = await get_or_create_site_settings(db)
    changes = data.model_dump(exclude_unset=True)
    actual_changes = {
        field_name: field_value
        for field_name, field_value in changes.items()
        if getattr(settings, field_name) != field_value
    }
    old_background = (
        settings.custom_background_asset_id
        if "custom_background_asset_id" in actual_changes
        else None
    )

    for field_name, field_value in actual_changes.items():
        setattr(settings, field_name, field_value)

    if actual_changes:
        field_labels = {
            "theme": "主题",
            "school_background_enabled": "校园背景开关",
            "custom_background_asset_id": "全站背景图片",
        }
        changed_fields = "、".join(
            field_labels.get(field_name, field_name)
            for field_name in actual_changes
        )
        record_audit_log(
            db,
            actor_id=actor_id,
            actor_name=actor_name,
            action="修改全站外观设置",
            resource_type="site_settings",
            resource_id=str(settings.id),
            target=f"全站设置：{changed_fields}",
        )
        await db.commit()
        await db.refresh(settings)
        await delete_upload_if_unused(db, old_background)

    return settings
