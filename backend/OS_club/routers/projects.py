"""
 @File : projects.py.py
 @Author : 加个真朋友
@Description :
"""
"""
项目接口。
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.projects import (
    delete_project as delete_project_record,
    get_project_by_id,
    get_project_by_slug,
    list_projects,
    list_projects_for_review,
    create_project as create_project_record,
    update_project as update_project_record,
    review_project as review_project_record,
    increase_project_views,
)
from crud.project_join_requests import (
    create_join_request,
    get_join_request_by_id,
    list_join_requests,
    review_join_request,
)
from crud.favorites import count_favorites, get_favorite
from crud.project_members import normalize_project_member_ids
from models.project_join_requests import ProjectJoinRequest
from models.projects import Project
from models.users import User
from schemas.projects import (
    ProjectCreateRequest,
    ProjectReviewRequest,
    ProjectResponse,
    ProjectUpdateRequest,
)
from schemas.project_join_requests import (
    ProjectJoinRequestCreate,
    ProjectJoinRequestResponse,
    ProjectJoinRequestReview,
)
from utils.auth import (
    get_current_user,
    get_optional_current_user,
    require_content_reviewer,
)


router = APIRouter(
    prefix="/api/projects",
    tags=["projects"],
)


async def build_project_response(
    db: AsyncSession,
    project: Project,
) -> ProjectResponse:
    """返回统一成员 ID 与准确成员数，兼容尚未编辑的旧项目数据。"""

    response = ProjectResponse.model_validate(project)
    response.member_ids = await normalize_project_member_ids(
        db,
        project.member_ids,
    )
    response.member_count = len(response.member_ids)
    return response


async def add_submitter_public_info(
    db: AsyncSession,
    project,
) -> ProjectResponse:
    """给审核列表补充提交人的公开资料，不暴露邮箱和密码。"""

    response = await build_project_response(db, project)
    if project.submitted_by is None:
        response.submitted_by_name = "项目提交人"
        response.submitted_by_direction = "未分配方向"
        return response

    submitter = await db.get(User, project.submitted_by)
    if submitter is None:
        response.submitted_by_name = "项目提交人"
        response.submitted_by_direction = "未分配方向"
        return response

    response.submitted_by_name = submitter.nickname or submitter.username
    response.submitted_by_direction = submitter.direction or "未分配方向"
    return response


async def add_project_favorite_info(
    db: AsyncSession,
    project: Project,
    current_user: User | None,
) -> ProjectResponse:
    """把收藏总数和当前用户收藏状态补充到项目响应。"""

    response = await build_project_response(db, project)
    project_id = str(project.id)
    response.favorite_count = await count_favorites(
        db=db,
        target_type="project",
        target_id=project_id,
    )

    if current_user is not None:
        response.is_favorited = (
            await get_favorite(
                db=db,
                user_id=current_user.id,
                target_type="project",
                target_id=project_id,
            )
            is not None
        )

    return response


async def build_project_response(
    db: AsyncSession,
    project: Project,
) -> ProjectResponse:
    """返回统一成员 ID 与准确成员数，兼容尚未编辑的旧项目数据。"""

    response = ProjectResponse.model_validate(project)
    response.member_ids = await normalize_project_member_ids(
        db,
        project.member_ids,
    )
    response.member_count = len(response.member_ids)
    return response


@router.get(
    "",
    response_model=list[ProjectResponse],
)
async def get_projects(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    获取项目列表。

    前端访问：
    GET /api/projects
    """

    # 从数据库查询项目。
    projects = await list_projects(db)

    # 每个项目补充收藏统计，游客也可以看到总收藏数。
    return [
        await add_project_favorite_info(db, project, current_user)
        for project in projects
    ]


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)


async def create_project(
    project_data: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    提交一个新项目。

    只有登录用户可以提交项目。
    项目提交后默认进入 pending 待审核状态。
    """

    # 调用 CRUD 函数保存项目。
    # current_user.id 用来记录项目提交人。
    project = await create_project_record(
        db=db,
        data=project_data,
        submitted_by=current_user.id,
    )

    return await build_project_response(db, project)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
)
async def update_project(
    project_id: int,
    project_data: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    修改项目。

    普通成员和组员只能修改自己提交的项目。
    负责人只能修改自己届次的项目。
    组长和旧管理员可以修改全部项目。
    """

    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 组长和旧管理员可以修改全部项目。
    if current_user.role in {"Leader", "Admin"}:
        can_update = True

    # 负责人只能修改自己届次的项目。
    elif current_user.role == "CohortLeader":
        reviewer_cohort = "".join(
            character
            for character in (
                current_user.cohort or ""
            )
            if character.isdigit()
        )

        can_update = reviewer_cohort == str(project.year)

    # 普通成员和组员只能修改自己提交的项目。
    else:
        can_update = project.submitted_by == current_user.id

        # 已经审核通过的项目不能由普通成员直接修改。
        if project.review_status == "approved":
            can_update = False

    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有修改这个项目的权限",
        )

    updated_project = await update_project_record(
        db=db,
        project_id=project_id,
        data=project_data,
    )

    return await build_project_response(db, updated_project)


@router.post(
    "/{project_id}/resubmit",
    response_model=ProjectResponse,
)
async def resubmit_project(
    project_id: int,
    project_data: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """原投稿人修改被退回的项目后，重新提交审核。"""

    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    if project.submitted_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能重新提交自己投稿的项目",
        )

    if project.review_status != "rejected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有被退回的项目可以重新提交",
        )

    updated_project = await update_project_record(
        db=db,
        project_id=project_id,
        data=project_data,
        resubmit=True,
    )

    return await add_project_favorite_info(
        db,
        updated_project,
        current_user,
    )


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    删除项目。

    普通成员和组员只能删除自己提交且未通过审核的项目。
    负责人只能删除自己届次的项目。
    组长和旧管理员可以删除全部项目。
    """

    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 组长和旧管理员可以删除全部项目。
    if current_user.role in {"Leader", "Admin"}:
        can_delete = True

    # 负责人只能删除自己届次的项目。
    elif current_user.role == "CohortLeader":
        reviewer_cohort = "".join(
            character
            for character in (
                current_user.cohort or ""
            )
            if character.isdigit()
        )

        can_delete = reviewer_cohort == str(project.year)

    # 普通成员和组员只能删除自己提交的项目。
    else:
        can_delete = project.submitted_by == current_user.id

        # 已经审核通过的项目不能由普通用户删除。
        if project.review_status == "approved":
            can_delete = False

    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有删除这个项目的权限",
        )

    deleted = await delete_project_record(
        db=db,
        project_id=project_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 204 表示删除成功，但不返回 JSON 内容。
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )


@router.post(
    "/{project_id}/review",
    response_model=ProjectResponse,
)
async def review_project(
    project_id: int,
    review_data: ProjectReviewRequest,
    current_reviewer: User = Depends(
        require_content_reviewer
    ),
    db: AsyncSession = Depends(get_database),
):
    """
    审核项目。

    Leader 和 Admin 可以审核全部项目。
    CohortLeader 只能审核自己届次的项目。
    """

    # 先查询要审核的项目。
    project = await get_project_by_id(
        db,
        project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 负责人只能审核自己所属届次的项目。
    if current_reviewer.role == "CohortLeader":
        reviewer_cohort = "".join(
            character
            for character in (
                current_reviewer.cohort or ""
            )
            if character.isdigit()
        )

        if reviewer_cohort != str(project.year):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="负责人只能审核自己届次的项目",
            )

    # 保存审核结果、审核意见、审核人和审核时间。
    reviewed_project = await review_project_record(
        db=db,
        project_id=project_id,
        reviewer_id=current_reviewer.id,
        reviewer_name=current_reviewer.nickname or current_reviewer.username,
        data=review_data,
    )

    return await build_project_response(db, reviewed_project)


@router.get(
    "/review-queue",
    response_model=list[ProjectResponse],
)
async def get_review_queue(
    current_reviewer: User = Depends(
        require_content_reviewer
    ),
    db: AsyncSession = Depends(get_database),
):
    """
    获取项目审核队列。

    Leader 和 Admin 可以查看全部待审核项目。
    CohortLeader 只能查看自己届次的项目。
    """

    cohort_year = None

    # 负责人只能查看自己届次的审核项目。
    if current_reviewer.role == "CohortLeader":
        reviewer_cohort = "".join(
            character
            for character in (
                current_reviewer.cohort or ""
            )
            if character.isdigit()
        )

        if not reviewer_cohort:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="当前负责人还没有分配届次",
            )

        cohort_year = int(reviewer_cohort)

    projects = await list_projects_for_review(
        db=db,
        cohort_year=cohort_year,
    )

    return [
        await add_submitter_public_info(db, project)
        for project in projects
    ]


async def build_join_request_response(
    db: AsyncSession,
    request: ProjectJoinRequest,
) -> ProjectJoinRequestResponse:
    """补充项目名称和申请人名称，避免前端再请求两次详情。"""

    project = await db.get(Project, request.project_id)
    user = await db.get(User, request.user_id)

    return ProjectJoinRequestResponse(
        id=request.id,
        project_id=request.project_id,
        project_name=project.name if project else None,
        user_id=request.user_id,
        user_name=(user.nickname or user.username) if user else None,
        message=request.message,
        status=request.status,
        review_note=request.review_note,
        reviewed_by=request.reviewed_by,
        reviewed_at=request.reviewed_at,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


@router.get(
    "/my-join-requests",
    response_model=list[ProjectJoinRequestResponse],
)
async def get_my_join_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """获取当前登录用户提交过的项目加入申请。"""

    requests = await list_join_requests(
        db=db,
        user_id=current_user.id,
    )
    return [
        await build_join_request_response(db, request)
        for request in requests
    ]


@router.get(
    "/join-requests",
    response_model=list[ProjectJoinRequestResponse],
)
async def get_join_request_queue(
    request_status: str | None = Query(
        default=None,
        alias="status",
    ),
    project_id: int | None = None,
    current_reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """获取项目加入申请审核队列。"""

    if request_status is not None and request_status not in {
        "pending",
        "approved",
        "rejected",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="申请状态不正确",
        )

    requests = await list_join_requests(
        db=db,
        project_id=project_id,
        request_status=request_status,
    )

    visible_requests: list[ProjectJoinRequest] = []
    for request in requests:
        project = await db.get(Project, request.project_id)
        if project is None:
            continue

        if current_reviewer.role == "CohortLeader":
            reviewer_cohort = "".join(
                character
                for character in (current_reviewer.cohort or "")
                if character.isdigit()
            )
            if reviewer_cohort != str(project.year):
                continue

        visible_requests.append(request)

    return [
        await build_join_request_response(db, request)
        for request in visible_requests
    ]


@router.post(
    "/{project_id}/join-requests",
    response_model=ProjectJoinRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_join_request(
    project_id: int,
    request_data: ProjectJoinRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """登录用户申请加入一个已经开放招募的项目。"""

    project = await get_project_by_id(db, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    try:
        join_request = await create_join_request(
            db=db,
            project=project,
            user=current_user,
            data=request_data,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    return await build_join_request_response(db, join_request)


@router.post(
    "/join-requests/{request_id}/review",
    response_model=ProjectJoinRequestResponse,
)
async def review_join_request_endpoint(
    request_id: int,
    review_data: ProjectJoinRequestReview,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """处理一条项目加入申请。"""

    join_request = await get_join_request_by_id(
        db=db,
        request_id=request_id,
    )
    if join_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="加入申请不存在",
        )

    project = await get_project_by_id(db, join_request.project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请对应的项目不存在",
        )

    if current_user.role not in {"CohortLeader", "Leader", "Admin"} and project.submitted_by != current_user.id:
        raise HTTPException(403, "无权处理")

    if current_user.role == "CohortLeader":
        cohort_year = "".join(filter(str.isdigit, current_user.cohort or ""))
        if cohort_year != str(project.year):
            raise HTTPException(403, "负责人只能审核自己届次项目的加入申请")

    try:
        reviewed_request = await review_join_request(
            db=db,
            request_id=request_id,
            reviewer_id=current_user.id,
            data=review_data,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if reviewed_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="加入申请不存在",
        )

    return await build_join_request_response(db, reviewed_request)


@router.post(
    "/{project_id}/view",
)
async def record_project_view(
    project_id: int,
    db: AsyncSession = Depends(get_database),
):
    """
    记录一次项目详情浏览。

    前端访问：
    POST /api/projects/{project_id}/view
    """

    project = await increase_project_views(
        db=db,
        project_id=project_id,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    # 前端只需要最新浏览量，不返回完整项目对象。
    return {
        "views": project.views,
    }


@router.get(
    "/{project_slug}",
    response_model=ProjectResponse,
)
async def get_project(
    project_slug: str,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    根据 slug 获取一个项目。

    例如：
    GET /api/projects/ai-campus
    """

    # 根据项目地址标识查询项目。
    project = await get_project_by_slug(
        db,
        project_slug,
    )

    # 找不到项目时返回 404。
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    return await add_project_favorite_info(
        db=db,
        project=project,
        current_user=current_user,
    )
