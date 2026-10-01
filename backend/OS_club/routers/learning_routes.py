"""供公开学习路线页面和管理后台使用的接口。"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.learning_routes import (
    create_learning_route,
    delete_learning_route,
    get_learning_route,
    list_learning_routes,
    update_learning_route,
)
from models.users import User
from schemas.learning_routes import (
    LearningRouteCreateRequest,
    LearningRouteResponse,
    LearningRouteUpdateRequest,
)
from utils.auth import get_optional_current_user, require_leader_or_admin


router = APIRouter(prefix="/api/learning-routes", tags=["learning-routes"])


def allowed_learning_route_visibilities(user: User | None) -> set[str]:
    """可见范围和前端 canViewContent 的访客、成员、组员规则一致。"""

    if user is None or user.role == "Visitor":
        return {"public"}
    if user.role in {"Contributor", "CohortLeader", "Leader", "Admin"}:
        return {"public", "members", "contributors"}
    return {"public", "members"}


@router.get("", response_model=list[LearningRouteResponse])
async def get_learning_routes(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取当前账号可以查看的学习路线。"""

    return await list_learning_routes(db, allowed_learning_route_visibilities(current_user))


@router.post(
    "",
    response_model=LearningRouteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_route(
    data: LearningRouteCreateRequest,
    db: AsyncSession = Depends(get_database),
    current_user: User = Depends(require_leader_or_admin),
):
    """新增路线只允许组长或兼容的旧版管理员角色。"""

    return await create_learning_route(db, data)


@router.get("/{route_id}", response_model=LearningRouteResponse)
async def get_learning_route_detail(
    route_id: str,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取单条路线；不可见的路线也按不存在处理。"""

    route = await get_learning_route(db, route_id)
    allowed_visibilities = allowed_learning_route_visibilities(current_user)
    if route is None or route.visibility not in allowed_visibilities:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学习路线不存在")
    return route


@router.patch("/{route_id}", response_model=LearningRouteResponse)
async def edit_learning_route(
    route_id: str,
    data: LearningRouteUpdateRequest,
    db: AsyncSession = Depends(get_database),
    current_user: User = Depends(require_leader_or_admin),
):
    """修改路线；数据库中的 ID 和创建时间不接受前端修改。"""

    route = await get_learning_route(db, route_id)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学习路线不存在")
    return await update_learning_route(db, route, data)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_learning_route(
    route_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: User = Depends(require_leader_or_admin),
):
    """删除路线；页面会自行阻止删除默认 PyAgent 路线。"""

    route = await get_learning_route(db, route_id)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="学习路线不存在")
    if route.id == "pyagent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="默认 PyAgent 路线不能删除")
    await delete_learning_route(db, route)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
