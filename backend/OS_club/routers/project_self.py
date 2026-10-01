"""登录用户自己的项目和项目加入申请查询接口。"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.project_join_requests import list_join_requests_for_project_owner
from crud.projects import list_projects_by_submitter
from models.users import User
from routers.projects import add_project_favorite_info, build_join_request_response
from schemas.project_join_requests import ProjectJoinRequestResponse
from schemas.projects import ProjectResponse
from utils.auth import get_current_user


router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
)


@router.get(
    "/my-submissions",
    response_model=list[ProjectResponse],
)
async def get_my_project_submissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """获取当前登录用户提交的全部项目及其审核状态。"""

    projects = await list_projects_by_submitter(
        db=db,
        submitter_id=current_user.id,
    )
    return [
        await add_project_favorite_info(db, project, current_user)
        for project in projects
    ]


@router.get(
    "/my-owned-join-requests",
    response_model=list[ProjectJoinRequestResponse],
)
async def get_my_owned_join_requests(
    request_status: str | None = Query(
        default=None,
        alias="status",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """获取当前用户提交的项目收到的加入申请。"""

    if request_status is not None and request_status not in {
        "pending",
        "approved",
        "rejected",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="申请状态不正确",
        )

    requests = await list_join_requests_for_project_owner(
        db=db,
        owner_id=current_user.id,
        request_status=request_status,
    )
    return [
        await build_join_request_response(db, request)
        for request in requests
    ]
