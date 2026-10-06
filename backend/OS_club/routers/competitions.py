"""比赛列表、比赛维护、往届成果和赛事提醒的 HTTP 接口。"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.competitions import (
    create_competition,
    create_competition_project,
    delete_competition,
    delete_competition_project,
    get_competition,
    get_competition_project,
    get_competition_reminder,
    list_competition_projects,
    list_competitions,
    list_projects_for_competitions,
    set_competition_reminder,
    update_competition,
    update_competition_project,
)
from models.cohorts import Cohort
from models.competitions import Competition, CompetitionProject
from models.users import User
from schemas.competitions import (
    CompetitionCreateRequest,
    CompetitionProjectCreateRequest,
    CompetitionProjectResponse,
    CompetitionProjectUpdateRequest,
    CompetitionReminderRequest,
    CompetitionReminderResponse,
    CompetitionResponse,
    CompetitionUpdateRequest,
)
from utils.auth import get_current_user, get_optional_current_user, require_leader_or_admin
from utils.uploads import delete_upload_if_unused


router = APIRouter(prefix="/api/competitions", tags=["competitions"])


def allowed_competition_visibilities(user: User | None) -> set[str]:
    """按用户身份确定可看到的赛事范围。"""

    # 未登录访客只能看到公开赛事。
    if user is None or user.role == "Visitor":
        return {"public"}

    # 组员、届次负责人和组长可以看到组员专属赛事。
    if user.role in {"Contributor", "CohortLeader", "Leader", "Admin"}:
        return {"public", "members", "contributors"}

    # 普通成员可以查看公共和全体成员可见的赛事。
    return {"public", "members"}


def is_competition_manager(user: User | None) -> bool:
    """赛事由组长统一维护；Admin 是旧版组长角色，暂时兼容。"""

    return user is not None and user.role in {"Leader", "Admin"}


async def get_accessible_competition(
    db: AsyncSession,
    competition_id: int,
    user: User | None,
) -> Competition:
    """查询一场比赛，并在返回前执行发布状态和可见范围检查。"""

    competition = await get_competition(db, competition_id)
    if competition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在",
        )

    # 管理赛事的账号需要在后台查看草稿和归档内容。
    if is_competition_manager(user):
        return competition

    # 不可见内容返回 404，避免泄露草稿或受限比赛是否存在。
    if competition.lifecycle != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")
    if competition.visibility not in allowed_competition_visibilities(user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")
    return competition


async def build_competition_response(
    db: AsyncSession,
    competition: Competition,
    projects: list[CompetitionProject] | None = None,
) -> CompetitionResponse:
    """把 ORM 比赛和成果转换成前端需要的 camelCase 响应。"""

    response = CompetitionResponse.model_validate(competition)
    competition_projects = (
        projects
        if projects is not None
        else await list_competition_projects(db, competition.id)
    )
    response.projects = [
        CompetitionProjectResponse.model_validate(project)
        for project in competition_projects
    ]
    return response


async def ensure_cohort_exists(db: AsyncSession, cohort_id: int | None) -> None:
    """当请求关联正式届次时，确认届次编号真实存在。"""

    if cohort_id is not None and await db.get(Cohort, cohort_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定届次不存在",
        )


@router.get("", response_model=list[CompetitionResponse])
async def get_competitions(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取比赛列表；普通访问者只取得已发布且对自己可见的内容。"""

    manager = is_competition_manager(current_user)
    competitions = await list_competitions(
        db,
        lifecycles={"draft", "published", "archived"} if manager else {"published"},
        visibilities=None if manager else allowed_competition_visibilities(current_user),
    )

    # 比赛列表和所有成果分别批量查询，避免每场比赛额外发起一次查询。
    projects_by_competition = await list_projects_for_competitions(
        db,
        [competition.id for competition in competitions],
    )
    return [
        await build_competition_response(
            db,
            competition,
            projects_by_competition.get(competition.id, []),
        )
        for competition in competitions
    ]


@router.post(
    "",
    response_model=CompetitionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_competition(
    competition_data: CompetitionCreateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """新增比赛；只有组长/旧版管理员可维护全局赛事。"""

    competition = await create_competition(
        db,
        competition_data,
        creator_id=current_user.id,
    )
    return await build_competition_response(db, competition, [])


@router.get("/{competition_id}", response_model=CompetitionResponse)
async def get_competition_detail(
    competition_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取单场比赛详情，权限规则与比赛列表相同。"""

    competition = await get_accessible_competition(db, competition_id, current_user)
    return await build_competition_response(db, competition)


@router.patch("/{competition_id}", response_model=CompetitionResponse)
async def edit_competition(
    competition_id: int,
    competition_data: CompetitionUpdateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """局部修改比赛信息，创建者、更新时间等字段由服务端控制。"""

    competition = await get_competition(db, competition_id)
    if competition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    updated_competition = await update_competition(
        db,
        competition,
        competition_data,
        updater_id=current_user.id,
    )
    return await build_competition_response(db, updated_competition)


@router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_competition(
    competition_id: int,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """删除比赛，同时清理它的往届成果和提醒设置。"""

    competition = await get_competition(db, competition_id)
    if competition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")
    old_images = [
        image
        for project in await list_competition_projects(db, competition.id)
        for image in (project.image_asset_id, project.image_url)
    ]
    await delete_competition(db, competition)
    for old_image in old_images:
        await delete_upload_if_unused(db, old_image)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{competition_id}/cohort-projects",
    response_model=list[CompetitionProjectResponse],
)
async def get_cohort_projects(
    competition_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取比赛详情中的往届成果。"""

    await get_accessible_competition(db, competition_id, current_user)
    projects = await list_competition_projects(db, competition_id)
    return [CompetitionProjectResponse.model_validate(project) for project in projects]


@router.post(
    "/{competition_id}/cohort-projects",
    response_model=CompetitionProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_cohort_project(
    competition_id: int,
    project_data: CompetitionProjectCreateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """为指定比赛添加一项往届成果。"""

    if await get_competition(db, competition_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")
    await ensure_cohort_exists(db, project_data.cohort_id)
    project = await create_competition_project(db, competition_id, project_data)
    return CompetitionProjectResponse.model_validate(project)


@router.patch(
    "/{competition_id}/cohort-projects/{project_id}",
    response_model=CompetitionProjectResponse,
)
async def edit_cohort_project(
    competition_id: int,
    project_id: int,
    project_data: CompetitionProjectUpdateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """修改一项成果；查询同时限定比赛编号，避免跨赛事修改。"""

    project = await get_competition_project(db, competition_id, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="往届项目不存在")
    if "cohort_id" in project_data.model_fields_set:
        await ensure_cohort_exists(db, project_data.cohort_id)

    old_images = (project.image_asset_id, project.image_url)
    updated_project = await update_competition_project(db, project, project_data)
    for old_image in old_images:
        await delete_upload_if_unused(db, old_image)
    return CompetitionProjectResponse.model_validate(updated_project)


@router.delete(
    "/{competition_id}/cohort-projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_cohort_project(
    competition_id: int,
    project_id: int,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """删除一项比赛往届成果。"""

    project = await get_competition_project(db, competition_id, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="往届项目不存在")
    old_images = (project.image_asset_id, project.image_url)
    await delete_competition_project(db, project)
    for old_image in old_images:
        await delete_upload_if_unused(db, old_image)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{competition_id}/reminder",
    response_model=CompetitionReminderResponse,
)
async def get_reminder(
    competition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """查询当前用户是否已设置这场比赛的提醒。"""

    await get_accessible_competition(db, competition_id, current_user)
    reminder = await get_competition_reminder(db, competition_id, current_user.id)
    if reminder is None:
        # 没有记录就表示关闭，仍返回前端固定需要的字段结构。
        return CompetitionReminderResponse(
            competitionId=str(competition_id),
            enabled=False,
        )
    return CompetitionReminderResponse.model_validate(reminder)


@router.post(
    "/{competition_id}/reminder",
    response_model=CompetitionReminderResponse,
)
async def update_reminder(
    competition_id: int,
    reminder_data: CompetitionReminderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """设置或取消当前用户的比赛提醒。"""

    await get_accessible_competition(db, competition_id, current_user)
    reminder = await set_competition_reminder(
        db,
        competition_id,
        current_user.id,
        reminder_data.enabled,
    )
    return CompetitionReminderResponse.model_validate(reminder)
