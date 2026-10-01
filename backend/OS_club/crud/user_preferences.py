"""当前账号个人偏好的数据库读取和更新操作。"""

from sqlalchemy.ext.asyncio import AsyncSession

from crud.site_settings import get_or_create_site_settings
from models.user_preferences import UserPreferences
from schemas.user_preferences import UserPreferencesResponse, UserPreferencesUpdateRequest
from utils.uploads import delete_upload_if_unused


async def get_user_preferences(
    db: AsyncSession,
    user_id: int,
) -> UserPreferences | UserPreferencesResponse:
    """读取当前账号偏好；首次使用时用全站设置作为默认值返回。"""

    preferences = await db.get(UserPreferences, user_id)
    if preferences is not None:
        return preferences

    # 账号还没有保存过个人偏好时，沿用组长设置的全站默认外观。
    site_settings = await get_or_create_site_settings(db)
    return UserPreferencesResponse(
        theme=site_settings.theme,
        backgroundPreference="follow" if site_settings.school_background_enabled else "paper",
        schoolBackgroundEnabled=site_settings.school_background_enabled,
        customBackgroundAssetId=None,
        customBackgroundUrl=None,
        reducedMotion=False,
        updatedAt=site_settings.updated_at,
    )


async def update_user_preferences(
    db: AsyncSession,
    user_id: int,
    data: UserPreferencesUpdateRequest,
) -> UserPreferences | UserPreferencesResponse:
    """保存当前账号提交的字段，不改动其他用户或未提交的偏好。"""

    changes = data.model_dump(exclude_unset=True)
    if "custom_background_url" in changes and changes["custom_background_url"] is None:
        # 切换回校园或纸张背景时，前端会清空 URL；同时清除对应文件 ID，
        # 否则数据库会一直保留旧图片的引用，文件也就无法清理。
        changes["custom_background_asset_id"] = None

    preferences = await db.get(UserPreferences, user_id)
    old_backgrounds = []
    if preferences is not None and (
        "custom_background_asset_id" in changes
        or "custom_background_url" in changes
    ):
        old_backgrounds = [
            preferences.custom_background_asset_id,
            preferences.custom_background_url,
        ]

    if preferences is None:
        if not changes:
            # 空 PATCH 不应为了读取默认值而新建数据库记录。
            return await get_user_preferences(db, user_id)

        site_settings = await get_or_create_site_settings(db)
        preferences = UserPreferences(
            user_id=user_id,
            theme=site_settings.theme,
            background_preference=(
                "follow" if site_settings.school_background_enabled else "paper"
            ),
            school_background_enabled=site_settings.school_background_enabled,
            custom_background_asset_id=None,
            custom_background_url=None,
            reduced_motion=False,
        )
        db.add(preferences)

    for field_name, field_value in changes.items():
        setattr(preferences, field_name, field_value)

    if changes:
        await db.commit()
        await db.refresh(preferences)
        for old_background in old_backgrounds:
            await delete_upload_if_unused(db, old_background)

    return preferences
