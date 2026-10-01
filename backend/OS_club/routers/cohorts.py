"""
 @File : cohorts.py.py
 @Author : 加个真朋友
@Description :
"""
"""
届次和小组接口。
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.club_config import list_cohort_photos
from crud.cohorts import (
    create_cohort as create_cohort_record,
    create_team as create_team_record,
    cohort_has_members,
    delete_cohort as delete_cohort_record,
    delete_team as delete_team_record,
    get_cohort_by_id,
    get_team_by_id,
    list_cohorts,
    list_teams,
    update_cohort as update_cohort_record,
    update_team as update_team_record,
)
from models.users import User
from schemas.cohorts import (
    CohortCreateRequest,
    CohortResponse,
    CohortTeamCreateRequest,
    CohortTeamResponse,
    CohortTeamUpdateRequest,
    CohortUpdateRequest,
)
from utils.auth import require_leader_or_admin
from utils.uploads import delete_upload_if_unused


router = APIRouter(
    prefix="/api/cohorts",
    tags=["cohorts"],
)


async def build_cohort_response(
    db: AsyncSession,
    cohort,
) -> CohortResponse:
    """
    把届次对象和它下面的小组合并成前端需要的格式。
    """

    response = CohortResponse.model_validate(cohort)

    teams = await list_teams(
        db,
        cohort.id,
    )

    response.teams = [
        CohortTeamResponse.model_validate(team)
        for team in teams
    ]

    return response


@router.get(
    "",
    response_model=list[CohortResponse],
)
async def get_cohorts(
    db: AsyncSession = Depends(get_database),
):
    """
    获取全部届次。

    前端启动时会调用这个接口，所以不要求登录。
    """

    cohorts = await list_cohorts(db)

    return [
        await build_cohort_response(db, cohort)
        for cohort in cohorts
    ]


@router.get(
    "/{cohort_id}",
    response_model=CohortResponse,
)
async def get_cohort(
    cohort_id: int,
    db: AsyncSession = Depends(get_database),
):
    """获取一个届次的详细信息。"""

    cohort = await get_cohort_by_id(
        db,
        cohort_id,
    )

    if cohort is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="届次不存在",
        )

    return await build_cohort_response(db, cohort)


@router.post(
    "",
    response_model=CohortResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_cohort(
    cohort_data: CohortCreateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    创建届次。

    只有组长或管理员可以创建。
    """

    existing_cohorts = await list_cohorts(db)

    if any(
        cohort.year == cohort_data.year.strip()
        for cohort in existing_cohorts
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="这个届次已经存在",
        )

    cohort = await create_cohort_record(
        db,
        cohort_data,
    )

    return await build_cohort_response(db, cohort)


@router.patch(
    "/{cohort_id}",
    response_model=CohortResponse,
)
async def update_cohort(
    cohort_id: int,
    cohort_data: CohortUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """修改届次信息。"""

    cohort = await update_cohort_record(
        db,
        cohort_id,
        cohort_data,
    )

    if cohort is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="届次不存在",
        )

    return await build_cohort_response(db, cohort)


@router.delete(
    "/{cohort_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cohort(
    cohort_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """删除届次及其下属小组。"""

    if await cohort_has_members(db, cohort_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该届次下仍有成员账号或成员档案，请先调整其所属届次后再删除",
        )

    photos = await list_cohort_photos(db, cohort_id)
    old_images = [photo.data_url for photo in photos]
    deleted = await delete_cohort_record(
        db,
        cohort_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="届次不存在",
        )

    for old_image in old_images:
        await delete_upload_if_unused(db, old_image)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )


@router.get(
    "/{cohort_id}/teams",
    response_model=list[CohortTeamResponse],
)
async def get_teams(
    cohort_id: int,
    db: AsyncSession = Depends(get_database),
):
    """获取某个届次下面的全部小组。"""

    cohort = await get_cohort_by_id(
        db,
        cohort_id,
    )

    if cohort is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="届次不存在",
        )

    return await list_teams(
        db,
        cohort_id,
    )


@router.post(
    "/{cohort_id}/teams",
    response_model=CohortTeamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    cohort_id: int,
    team_data: CohortTeamCreateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """在指定届次下面创建小组。"""

    cohort = await get_cohort_by_id(
        db,
        cohort_id,
    )

    if cohort is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="届次不存在",
        )

    return await create_team_record(
        db,
        cohort_id,
        team_data,
    )


@router.patch(
    "/{cohort_id}/teams/{team_id}",
    response_model=CohortTeamResponse,
)
async def update_team(
    cohort_id: int,
    team_id: int,
    team_data: CohortTeamUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """修改指定届次下面的小组。"""

    team = await update_team_record(
        db,
        cohort_id,
        team_id,
        team_data,
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="小组不存在",
        )

    return team


@router.delete(
    "/{cohort_id}/teams/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_team(
    cohort_id: int,
    team_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """删除指定届次下面的小组。"""

    deleted = await delete_team_record(
        db,
        cohort_id,
        team_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="小组不存在",
        )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
