"""公告列表和管理接口。"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.announcements import (
    ADMIN_SCOPE,
    PUBLIC_SCOPE,
    create_announcement,
    delete_announcement,
    get_announcement,
    get_cohort_announcement_scope,
    list_announcements,
    update_announcement,
)
from models.users import User
from schemas.announcements import (
    AnnouncementCreateRequest,
    AnnouncementResponse,
    AnnouncementUpdateRequest,
)
from utils.auth import get_current_user, get_optional_current_user


router = APIRouter(
    prefix="/api/announcements",
    tags=["announcements"],
)


def is_valid_announcement_scope(scope: str) -> bool:
    """只接受全站、管理员或“年份 + 届可见”这三种范围。"""

    if scope in {PUBLIC_SCOPE, ADMIN_SCOPE}:
        return True

    cohort_year = "".join(character for character in scope if character.isdigit())
    return len(cohort_year) == 4 and scope == f"{cohort_year} 届可见"


def can_manage_announcement_scope(user: User, scope: str) -> bool:
    """组长可管理所有公告，届次负责人只能管理自己届次的公告。"""

    if user.role in {"Leader", "Admin"}:
        return True
    if user.role != "CohortLeader":
        return False

    own_scope = get_cohort_announcement_scope(user.cohort)
    return own_scope is not None and scope == own_scope


@router.get("", response_model=list[AnnouncementResponse])
async def get_announcements(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取当前访问者有权看到的公告。"""

    return await list_announcements(db, current_user)


@router.post(
    "",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_announcement(
    data: AnnouncementCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """组长或届次负责人创建公告。"""

    if not is_valid_announcement_scope(data.scope):
        raise HTTPException(status_code=422, detail="公告可见范围无效")
    if not can_manage_announcement_scope(current_user, data.scope):
        raise HTTPException(status_code=403, detail="当前账号不能管理这个范围的公告")

    return await create_announcement(db, data, current_user)


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
async def edit_announcement(
    announcement_id: int,
    data: AnnouncementUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """修改公告；届次负责人只能修改自己届次的公告。"""

    announcement = await get_announcement(db, announcement_id)
    if announcement is None:
        raise HTTPException(status_code=404, detail="公告不存在")

    new_scope = data.scope if data.scope is not None else announcement.scope
    if not is_valid_announcement_scope(new_scope):
        raise HTTPException(status_code=422, detail="公告可见范围无效")
    if not can_manage_announcement_scope(current_user, announcement.scope):
        raise HTTPException(status_code=403, detail="当前账号不能修改这条公告")
    if not can_manage_announcement_scope(current_user, new_scope):
        raise HTTPException(status_code=403, detail="不能把公告移动到其他届次或全站范围")

    return await update_announcement(db, announcement, data, current_user)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """删除公告；届次负责人只能删除自己届次的公告。"""

    announcement = await get_announcement(db, announcement_id)
    if announcement is None:
        raise HTTPException(status_code=404, detail="公告不存在")
    if not can_manage_announcement_scope(current_user, announcement.scope):
        raise HTTPException(status_code=403, detail="当前账号不能删除这条公告")

    await delete_announcement(db, announcement, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
