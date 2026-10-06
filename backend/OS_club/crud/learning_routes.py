"""学习路线的数据库新增、查询、修改和删除操作。"""

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.learning_routes import LearningRoute
from schemas.learning_routes import LearningRouteCreateRequest, LearningRouteUpdateRequest


async def list_learning_routes(
    db: AsyncSession,
    allowed_visibilities: set[str],
) -> list[LearningRoute]:
    """只查询当前访问者有权查看的路线。"""

    statement = (
        select(LearningRoute)
        .where(LearningRoute.visibility.in_(allowed_visibilities))
        .order_by(LearningRoute.created_at, LearningRoute.id)
    )
    result = await db.execute(statement)
    return list(result.scalars().all())


async def get_learning_route(db: AsyncSession, route_id: str) -> LearningRoute | None:
    """根据前端的字符串 ID 查找路线。"""

    return await db.get(LearningRoute, route_id)


async def create_learning_route(
    db: AsyncSession,
    data: LearningRouteCreateRequest,
) -> LearningRoute:
    """生成新 ID 并把路线和节点一起保存。"""

    values = data.model_dump(exclude={"nodes", "featured_project_ids"})
    route = LearningRoute(
        id=f"route-{uuid4().hex}",
        **values,
        nodes=[node.model_dump(by_alias=True) for node in data.nodes],
        featured_project_ids=data.featured_project_ids,
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return route


async def update_learning_route(
    db: AsyncSession,
    route: LearningRoute,
    data: LearningRouteUpdateRequest,
) -> LearningRoute:
    """只更新请求中出现的字段；节点仍作为整组 JSON 保存。"""

    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "nodes" in changes:
        changes["nodes"] = [node.model_dump(by_alias=True) for node in data.nodes or []]

    for field_name, field_value in changes.items():
        setattr(route, field_name, field_value)

    await db.commit()
    await db.refresh(route)
    return route


async def delete_learning_route(db: AsyncSession, route: LearningRoute) -> None:
    """从数据库中删除一条路线。"""

    await db.delete(route)
    await db.commit()
