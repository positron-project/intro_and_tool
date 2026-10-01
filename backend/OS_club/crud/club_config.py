"""届次照片和可编辑站点文案的数据库操作。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.cohort_photos import CohortPhoto
from models.cohorts import Cohort
from models.site_copy import SiteCopy
from schemas.cohort_photos import CohortPhotoCreateRequest, CohortPhotoUpdateRequest
from schemas.site_copy import SiteCopyUpdateRequest


DEFAULT_SITE_COPY = [
    {"id": "purpose", "label": "首页 · 我们的目的", "title": "我们的目的，只为", "body": "让想法传承，让成果延续。", "author": None},
    {"id": "quote", "label": "工具页 · 名言警句", "title": "代码是写给人看的，附带能在机器上运行。", "body": "", "author": "Harold Abelson"},
    {"id": "letter", "label": "小组风采 · 传承寄语", "title": "把这一届的经验，留给下一届。", "body": "你不需要在大一就知道自己最终会去哪里，先和身边的人一起把一个项目做完。", "author": "传承寄语 · 计算机科技小组"},
    {"id": "direction", "label": "工具页 · 小组方向", "title": "小组方向", "body": "算法、项目与网安，围绕真实问题协作。", "author": None},
]


async def list_site_copy(db: AsyncSession) -> list[SiteCopy]:
    """第一次访问时写入与本地演示相同的默认文案。"""

    result = await db.execute(select(SiteCopy).order_by(SiteCopy.id))
    rows = list(result.scalars().all())
    if rows:
        return rows

    rows = [SiteCopy(**item) for item in DEFAULT_SITE_COPY]
    db.add_all(rows)
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return rows


async def update_site_copy(db: AsyncSession, item_id: str, data: SiteCopyUpdateRequest) -> SiteCopy | None:
    item = await db.get(SiteCopy, item_id)
    if item is None:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value.strip() if isinstance(value, str) else value)
    await db.commit()
    await db.refresh(item)
    return item


async def list_cohort_photos(db: AsyncSession, cohort_id: int) -> list[CohortPhoto]:
    result = await db.execute(
        select(CohortPhoto)
        .where(CohortPhoto.cohort_id == cohort_id)
        .order_by(CohortPhoto.created_at.desc(), CohortPhoto.id.desc())
    )
    return list(result.scalars().all())


async def create_cohort_photo(db: AsyncSession, data: CohortPhotoCreateRequest) -> CohortPhoto | None:
    cohort = await db.get(Cohort, data.cohort_id)
    if cohort is None:
        return None

    if data.is_cover:
        for photo in await list_cohort_photos(db, data.cohort_id):
            photo.is_cover = False

    photo = CohortPhoto(
        cohort_id=data.cohort_id,
        data_url=data.data_url.strip(),
        name=data.name.strip(),
        caption=data.caption.strip(),
        is_cover=data.is_cover,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


async def update_cohort_photo(
    db: AsyncSession,
    photo: CohortPhoto,
    data: CohortPhotoUpdateRequest,
) -> CohortPhoto:
    changes = data.model_dump(exclude_unset=True)
    if changes.get("is_cover") is True:
        for other in await list_cohort_photos(db, photo.cohort_id):
            other.is_cover = other.id == photo.id
    for key, value in changes.items():
        setattr(photo, key, value.strip() if isinstance(value, str) else value)
    await db.commit()
    await db.refresh(photo)
    return photo


async def set_cohort_photo_cover(db: AsyncSession, photo: CohortPhoto) -> CohortPhoto:
    for other in await list_cohort_photos(db, photo.cohort_id):
        other.is_cover = other.id == photo.id
    await db.commit()
    await db.refresh(photo)
    return photo


async def delete_cohort_photo(db: AsyncSession, photo: CohortPhoto) -> str:
    """删除照片记录，并把图片地址交给路由层做安全的文件清理。"""

    data_url = photo.data_url
    was_cover = photo.is_cover
    cohort_id = photo.cohort_id
    await db.delete(photo)
    await db.flush()

    if was_cover:
        remaining = await list_cohort_photos(db, cohort_id)
        if remaining:
            remaining[0].is_cover = True

    await db.commit()
    return data_url
