"""
 @File : resources.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源库接口。

普通访问接口：
GET  /api/resources
GET  /api/resources/{resource_id}
POST /api/resources/{resource_id}/view

管理员接口：
POST   /api/admin/resources
PATCH  /api/admin/resources/{resource_id}
DELETE /api/admin/resources/{resource_id}
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
from crud.cohorts import get_cohort_by_year
from crud.favorites import count_favorites, get_favorite
from crud.resources import (
    create_resource as create_resource_record,
    delete_resource as delete_resource_record,
    get_resource_by_id,
    increase_resource_views,
    list_resources,
    update_resource as update_resource_record,
)
from models.users import User
from schemas.resources import (
    ResourceCreateRequest,
    ResourceResponse,
    ResourceUpdateRequest,
)
from utils.uploads import delete_upload_if_unused
from utils.auth import (
    get_current_user,
    get_optional_current_user,
    require_content_reviewer,
)


router = APIRouter(
    prefix="/api",
    tags=["resources"],
)


def cohort_digits(cohort: str | None) -> str:
    """从用户届次中提取年份数字，例如把“2029 届”转换成“2029”。"""

    return "".join(character for character in (cohort or "") if character.isdigit())


async def get_user_cohort_id(
    db: AsyncSession,
    user: User,
) -> int | None:
    """根据用户资料中的届次年份，找到 cohorts 表中的届次编号。"""

    year = cohort_digits(user.cohort)
    if not year:
        return None

    cohort = await get_cohort_by_year(db, year)
    return cohort.id if cohort is not None else None


async def can_manage_resource(
    db: AsyncSession,
    user: User,
    resource,
) -> bool:
    """组长可管理全部资源；届次负责人只能管理自己届次的资源。"""

    if user.role in {"Leader", "Admin"}:
        return True

    if user.role != "CohortLeader":
        return False

    user_cohort_id = await get_user_cohort_id(db, user)
    return user_cohort_id is not None and resource.cohort_id == user_cohort_id


def can_view_resource(
    current_user: User | None,
    visibility: str,
) -> bool:
    """
    判断当前用户能否查看指定可见范围的资源。

    public：
        所有人可以查看。

    members：
        登录后的普通成员及更高权限用户可以查看。

    contributors：
        组员、届次负责人和组长可以查看。
    """

    if visibility == "public":
        return True

    if current_user is None:
        return False

    if current_user.status != "active":
        return False

    if visibility == "members":
        return current_user.role in {
            "Member",
            "Contributor",
            "CohortLeader",
            "Leader",
            "Admin",
        }

    if visibility == "contributors":
        return current_user.role in {
            "Contributor",
            "CohortLeader",
            "Leader",
            "Admin",
        }

    return False


async def build_resource_response(
    db: AsyncSession,
    resource,
    current_user: User | None = None,
) -> ResourceResponse:
    """
    把数据库模型转换成前端响应格式。

    数据库字段 updated_at 是时间类型，
    前端旧字段 updated 是字符串，
    所以这里把 updated_at 转成字符串。
    """

    response = ResourceResponse.model_validate(resource)

    if resource.updated_at is not None:
        response.updated = resource.updated_at.strftime("%Y-%m-%d")

    # 收藏关系单独保存在 favorites 表中，不能直接从资源表读取。
    response.favorite_count = await count_favorites(
        db=db,
        target_type="resource",
        target_id=str(resource.id),
    )

    if current_user is not None:
        response.is_favorited = (
            await get_favorite(
                db=db,
                user_id=current_user.id,
                target_type="resource",
                target_id=str(resource.id),
            )
            is not None
        )

    return response


@router.get(
    "/resources",
    response_model=list[ResourceResponse],
)
async def get_resources(
    category: str | None = Query(
        default=None,
        description="资源分类",
    ),
    search: str | None = Query(
        default=None,
        description="标题或简介搜索关键词",
    ),
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    获取资源列表。

    未登录用户只能看到 public 资源。
    登录用户可以看到自己权限范围内的资源。
    """

    resources = await list_resources(
        db=db,
        include_unpublished=False,
        category=category,
        search=search,
    )

    visible_resources = [
        resource
        for resource in resources
        if can_view_resource(
            current_user=current_user,
            visibility=resource.visibility,
        )
    ]

    return [
        await build_resource_response(
            db=db,
            resource=resource,
            current_user=current_user,
        )
        for resource in visible_resources
    ]


@router.get(
    "/resources/{resource_id}",
    response_model=ResourceResponse,
)
async def get_resource_detail(
    resource_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    获取一条资源详情。
    """

    resource = await get_resource_by_id(
        db=db,
        resource_id=resource_id,
    )

    if resource is None or resource.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    if not can_view_resource(
        current_user=current_user,
        visibility=resource.visibility,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有查看该资源的权限",
        )

    return await build_resource_response(
        db=db,
        resource=resource,
        current_user=current_user,
    )


@router.post(
    "/resources/{resource_id}/view",
    response_model=ResourceResponse,
)
async def record_resource_view(
    resource_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    记录一次资源浏览。

    只有能够查看资源的用户才能增加浏览量。
    """

    resource = await get_resource_by_id(
        db=db,
        resource_id=resource_id,
    )

    if resource is None or resource.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    if not can_view_resource(
        current_user=current_user,
        visibility=resource.visibility,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有查看该资源的权限",
        )

    resource = await increase_resource_views(
        db=db,
        resource_id=resource_id,
    )

    return await build_resource_response(
        db=db,
        resource=resource,
        current_user=current_user,
    )


@router.post(
    "/admin/resources",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_resource(
    resource_data: ResourceCreateRequest,
    current_user: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """
    创建一条资源。

    当前只有届次负责人、组长和管理员可以直接维护资源。
    """

    cohort_id = None
    if current_user.role == "CohortLeader":
        cohort_id = await get_user_cohort_id(db, current_user)
        if cohort_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="当前账号没有关联有效届次，无法创建资源",
            )

    resource = await create_resource_record(
        db=db,
        data=resource_data,
        created_by=current_user.id,
        cohort_id=cohort_id,
    )

    return await build_resource_response(
        db=db,
        resource=resource,
        current_user=current_user,
    )


@router.patch(
    "/admin/resources/{resource_id}",
    response_model=ResourceResponse,
)
async def update_resource(
    resource_id: int,
    resource_data: ResourceUpdateRequest,
    current_user: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """
    修改一条资源。
    """

    resource = await get_resource_by_id(db, resource_id)
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    if not await can_manage_resource(db, current_user, resource):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="届次负责人只能修改本届资源",
        )

    old_files = [*(resource.attachments or []), resource.download_url]

    resource = await update_resource_record(
        db=db,
        resource_id=resource_id,
        data=resource_data,
        updated_by=current_user.id,
    )

    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    for old_file in old_files:
        if isinstance(old_file, dict):
            await delete_upload_if_unused(db, old_file.get("assetId") or old_file.get("url"))
        else:
            await delete_upload_if_unused(db, old_file)

    return await build_resource_response(
        db=db,
        resource=resource,
        current_user=current_user,
    )


@router.delete(
    "/admin/resources/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_resource(
    resource_id: int,
    current_user: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """
    删除一条资源。
    """

    resource = await get_resource_by_id(db, resource_id)
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    if not await can_manage_resource(db, current_user, resource):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="届次负责人只能删除本届资源",
        )

    old_files = [*(resource.attachments or []), resource.download_url]

    deleted = await delete_resource_record(
        db=db,
        resource_id=resource_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在",
        )

    for old_file in old_files:
        if isinstance(old_file, dict):
            await delete_upload_if_unused(db, old_file.get("assetId") or old_file.get("url"))
        else:
            await delete_upload_if_unused(db, old_file)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
