"""
内容收藏数据库操作。

收藏数量不由前端提交，而是每次根据 favorites 表重新统计，
这样用户重复点击或多端操作时不会把数量加错。
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.favorites import Favorite
from models.interviews import Interview
from models.projects import Project
from models.prompts import PromptTemplate
from models.users import User
from models.resources import Resource

SUPPORTED_TARGET_TYPES = {"project", "resource", "interview", "prompt"}


async def ensure_target_exists(
    db: AsyncSession,
    target_type: str,
    target_id: str,
    user: User,
) -> Project | Resource | Interview | PromptTemplate:
    """
    检查收藏目标是否存在。

    目前支持：
    - project：已审核通过的项目
    - resource：已发布的资源
    - interview：已审核通过且当前用户有权查看的面经
    """

    if target_type not in {"project", "resource", "interview", "prompt"}:
        raise ValueError("当前暂不支持收藏这种内容")

    try:
        target_id_number = int(target_id)
    except ValueError as error:
        raise ValueError("内容编号不正确") from error

    if target_type == "project":
        project = await db.get(Project, target_id_number)

        if project is None or project.review_status != "approved":
            raise ValueError("项目不存在或尚未通过审核")

        return project

    if target_type == "interview":
        interview = await db.get(Interview, target_id_number)
        if interview is None or interview.status != "approved":
            raise ValueError("面经不存在或尚未通过审核")

        can_view = (
            interview.visibility == "public"
            or interview.visibility == "members" and user.role != "Visitor"
            or interview.visibility == "contributors" and user.role in {
                "Contributor", "CohortLeader", "Leader", "Admin",
            }
        )
        if not can_view:
            raise ValueError("当前账号无权收藏这条面经")

        return interview

    if target_type == "prompt":
        prompt = await db.get(PromptTemplate, target_id_number)
        if prompt is None or prompt.status != "approved":
            raise ValueError("Prompt 模板不存在或尚未通过审核")
        return prompt

    resource = await db.get(Resource, target_id_number)

    if resource is None or resource.status != "published":
        raise ValueError("资源不存在或尚未发布")

    return resource


async def count_favorites(
    db: AsyncSession,
    target_type: str,
    target_id: str,
) -> int:
    """统计一个内容目标的收藏数。"""

    result = await db.execute(
        select(func.count(Favorite.id)).where(
            Favorite.target_type == target_type,
            Favorite.target_id == target_id,
        )
    )
    return int(result.scalar_one() or 0)


async def get_favorite(
    db: AsyncSession,
    user_id: int,
    target_type: str,
    target_id: str,
) -> Favorite | None:
    """查询当前用户对一个目标的收藏记录。"""

    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user_id,
            Favorite.target_type == target_type,
            Favorite.target_id == target_id,
        )
    )
    return result.scalar_one_or_none()


async def build_favorite_result(
    db: AsyncSession,
    user_id: int,
    target_type: str,
    target_id: str,
    favorite: Favorite | None,
) -> dict:
    """统一构造收藏接口返回值。"""

    return {
        "id": favorite.id if favorite else None,
        "target_type": target_type,
        "target_id": target_id,
        "is_favorited": favorite is not None,
        "favorite_count": await count_favorites(
            db=db,
            target_type=target_type,
            target_id=target_id,
        ),
        "created_at": favorite.created_at if favorite else None,
    }


async def add_favorite(
    db: AsyncSession,
    user: User,
    target_type: str,
    target_id: str,
) -> dict:
    """新增收藏；重复调用保持幂等。"""

    target = await ensure_target_exists(db, target_type, target_id, user)
    favorite = await get_favorite(db, user.id, target_type, target_id)

    if favorite is None:
        favorite = Favorite(
            user_id=user.id,
            target_type=target_type,
            target_id=target_id,
        )
        db.add(favorite)
        await db.flush()

    if target_type == "project" and target is not None:
        target.stars = await count_favorites(db, target_type, target_id)

    await db.commit()
    await db.refresh(favorite)
    return await build_favorite_result(db, user.id, target_type, target_id, favorite)


async def remove_favorite(
    db: AsyncSession,
    user: User,
    target_type: str,
    target_id: str,
) -> dict:
    """取消收藏；目标不存在时返回清晰的业务错误。"""

    target = await ensure_target_exists(db, target_type, target_id, user)
    favorite = await get_favorite(db, user.id, target_type, target_id)

    if favorite is not None:
        await db.delete(favorite)
        await db.flush()

    if target_type == "project" and target is not None:
        target.stars = await count_favorites(db, target_type, target_id)

    await db.commit()
    return await build_favorite_result(db, user.id, target_type, target_id, None)


async def list_user_favorites(
    db: AsyncSession,
    user_id: int,
) -> list[dict]:
    """获取当前用户收藏的所有内容。"""

    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user_id,
        ).order_by(
            Favorite.created_at.desc(),
        )
    )
    favorites = list(result.scalars().all())

    return [
        await build_favorite_result(
            db=db,
            user_id=user_id,
            target_type=favorite.target_type,
            target_id=favorite.target_id,
            favorite=favorite,
        )
        for favorite in favorites
    ]
