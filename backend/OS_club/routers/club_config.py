"""小组风采相关的届次文案和合影接口。"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.club_config import (
    create_cohort_photo,
    delete_cohort_photo,
    list_cohort_photos,
    list_site_copy,
    set_cohort_photo_cover,
    update_cohort_photo,
    update_site_copy,
)
from models.cohort_photos import CohortPhoto
from models.cohorts import Cohort
from models.users import User
from schemas.cohort_photos import CohortPhotoCreateRequest, CohortPhotoResponse, CohortPhotoUpdateRequest
from schemas.site_copy import SiteCopyResponse, SiteCopyUpdateRequest
from utils.auth import get_current_user, require_leader_or_admin
from utils.uploads import delete_upload_if_unused


router = APIRouter(tags=["Club configuration"])


def cohort_year_digits(value: str | None) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def ensure_can_manage_cohort(user: User, cohort: Cohort) -> None:
    """组长管理所有届；届次负责人只能管理自己届次的照片。"""

    if user.role in {"Leader", "Admin"}:
        return
    if user.role == "CohortLeader" and cohort_year_digits(user.cohort) == cohort_year_digits(cohort.year):
        return
    raise HTTPException(status_code=403, detail="没有权限管理这个届次的照片")


async def get_photo_or_404(db: AsyncSession, photo_id: int) -> CohortPhoto:
    photo = await db.get(CohortPhoto, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="照片不存在")
    return photo


async def ensure_can_manage_photo(db: AsyncSession, user: User, photo: CohortPhoto) -> None:
    cohort = await db.get(Cohort, photo.cohort_id)
    if cohort is None:
        raise HTTPException(status_code=404, detail="所属届次不存在")
    ensure_can_manage_cohort(user, cohort)


@router.get("/api/site-copy", response_model=list[SiteCopyResponse])
async def get_site_copy(db: AsyncSession = Depends(get_database)):
    return await list_site_copy(db)


@router.patch("/api/site-copy/{item_id}", response_model=SiteCopyResponse)
async def edit_site_copy(
    item_id: str,
    data: SiteCopyUpdateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    del current_user
    item = await update_site_copy(db, item_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="文案记录不存在")
    return item


@router.get("/api/cohorts/{cohort_id}/photos", response_model=list[CohortPhotoResponse])
async def get_cohort_photos(cohort_id: int, db: AsyncSession = Depends(get_database)):
    if await db.get(Cohort, cohort_id) is None:
        raise HTTPException(status_code=404, detail="届次不存在")
    return await list_cohort_photos(db, cohort_id)


@router.post(
    "/api/cohorts/{cohort_id}/photos",
    response_model=CohortPhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_cohort_photo(
    cohort_id: int,
    data: CohortPhotoCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    if cohort_id != data.cohort_id:
        raise HTTPException(status_code=400, detail="照片所属届次与请求地址不一致")
    cohort = await db.get(Cohort, cohort_id)
    if cohort is None:
        raise HTTPException(status_code=404, detail="届次不存在")
    ensure_can_manage_cohort(current_user, cohort)
    photo = await create_cohort_photo(db, data)
    if photo is None:
        raise HTTPException(status_code=404, detail="届次不存在")
    return photo


@router.patch("/api/photos/{photo_id}", response_model=CohortPhotoResponse)
async def edit_cohort_photo(
    photo_id: int,
    data: CohortPhotoUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    photo = await get_photo_or_404(db, photo_id)
    await ensure_can_manage_photo(db, current_user, photo)
    old_image = photo.data_url
    updated_photo = await update_cohort_photo(db, photo, data)
    await delete_upload_if_unused(db, old_image)
    return updated_photo


@router.patch("/api/photos/{photo_id}/cover", response_model=CohortPhotoResponse)
async def make_photo_cover(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    photo = await get_photo_or_404(db, photo_id)
    await ensure_can_manage_photo(db, current_user, photo)
    return await set_cohort_photo_cover(db, photo)


@router.delete("/api/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cohort_photo(
    photo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    photo = await get_photo_or_404(db, photo_id)
    await ensure_can_manage_photo(db, current_user, photo)
    data_url = await delete_cohort_photo(db, photo)
    await delete_upload_if_unused(db, data_url)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
