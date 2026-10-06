"""
 @File : members.py.py
 @Author : 加个真朋友
@Description :
"""
"""
成员目录接口。
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.members import (
    create_member as create_member_record,
    delete_member as delete_member_record,
    get_member_by_id,
    list_members,
    update_member as update_member_record,
)
from models.cohorts import Cohort
from models.members import Member
from models.users import User
from schemas.members import (
    MemberCreateRequest,
    MemberResponse,
    MemberUpdateRequest,
)
from utils.auth import require_leader_or_admin
from utils.uploads import delete_upload_if_unused


router = APIRouter(
    prefix="/api/members",
    tags=["members"],
)


async def build_member_response(
    db: AsyncSession,
    member: Member,
) -> MemberResponse:
    """
    把数据库成员对象转换成前端需要的格式。
    """

    cohort_name = "待分配"

    if member.cohort_id is not None:
        cohort_result = await db.get(
            Cohort,
            member.cohort_id,
        )

        if cohort_result is not None:
            cohort_name = f"{cohort_result.year} 届"

    return MemberResponse(
        id=str(member.id),
        user_id=member.user_id,
        username=member.username,
        name=member.name,
        role=member.role,
        cohort=cohort_name,
        direction=member.direction or "待补充",
        initials=member.initials or member.name[:2],
        accent=member.accent,
        avatar_url=member.avatar_url,
        status=member.status,
        projects=[],
        created_at=member.created_at,
        updated_at=member.updated_at,
    )


@router.get(
    "",
    response_model=list[MemberResponse],
)
async def get_members(
    cohort_id: int | None = Query(
        default=None,
        alias="cohortId",
    ),
    team_id: int | None = Query(
        default=None,
        alias="teamId",
    ),
    search: str | None = None,
    db: AsyncSession = Depends(get_database),
):
    """
    获取成员列表。

    前台成员页面可以直接访问，不要求登录。
    """

    members = await list_members(
        db=db,
        cohort_id=cohort_id,
        team_id=team_id,
        search=search,
    )

    return [
        await build_member_response(db, member)
        for member in members
    ]


@router.get(
    "/{member_id}",
    response_model=MemberResponse,
)
async def get_member(
    member_id: int,
    db: AsyncSession = Depends(get_database),
):
    """获取单个成员资料。"""

    member = await get_member_by_id(
        db,
        member_id,
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="成员不存在",
        )

    return await build_member_response(
        db,
        member,
    )


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_member(
    member_data: MemberCreateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    添加成员目录资料。

    只有组长或管理员可以添加。
    """

    try:
        member = await create_member_record(
            db,
            member_data,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return await build_member_response(
        db,
        member,
    )


@router.patch(
    "/{member_id}",
    response_model=MemberResponse,
)
async def update_member(
    member_id: int,
    member_data: MemberUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """修改成员目录资料。"""

    try:
        existing_member = await get_member_by_id(db, member_id)
        old_avatar = existing_member.avatar_url if existing_member else None
        member = await update_member_record(
            db,
            member_id,
            member_data,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="成员不存在",
        )

    await delete_upload_if_unused(db, old_avatar)

    return await build_member_response(
        db,
        member,
    )


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_member(
    member_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """删除成员目录资料。"""

    member = await get_member_by_id(db, member_id)
    old_avatar = member.avatar_url if member else None
    deleted = await delete_member_record(
        db,
        member_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="成员不存在",
        )

    await delete_upload_if_unused(db, old_avatar)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
