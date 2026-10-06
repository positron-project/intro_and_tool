"""
 @File : resources.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源库数据库操作。

crud 层只负责数据库读写：
- 查询资源
- 创建资源
- 修改资源
- 删除资源
- 增加浏览量

权限判断放在 routers/resources.py。
"""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.resources import Resource
from schemas.resources import (
    ResourceCreateRequest,
    ResourceUpdateRequest,
)


async def list_resources(
    db: AsyncSession,
    include_unpublished: bool = False,
    category: str | None = None,
    search: str | None = None,
) -> list[Resource]:
    """
    查询资源列表。

    普通用户只能看到已发布资源。
    管理员查看管理列表时，可以传入 include_unpublished=True，
    这样草稿、待审核和已归档资源也能被查询到。
    """

    statement = select(Resource)

    # 普通资源列表只显示已发布资源。
    if not include_unpublished:
        statement = statement.where(
            Resource.status == "published",
        )

    # 按分类筛选。
    if category:
        statement = statement.where(
            Resource.category == category,
        )

    # 按标题或简介搜索。
    if search:
        keyword = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Resource.title.ilike(keyword),
                Resource.description.ilike(keyword),
            ),
        )

    statement = statement.order_by(
        Resource.updated_at.desc(),
    )

    result = await db.execute(statement)

    return list(result.scalars().all())


async def get_resource_by_id(
    db: AsyncSession,
    resource_id: int,
) -> Resource | None:
    """
    根据资源编号查询一条资源。
    """

    return await db.get(Resource, resource_id)


async def create_resource(
    db: AsyncSession,
    data: ResourceCreateRequest,
    created_by: int | None = None,
    cohort_id: int | None = None,
) -> Resource:
    """
    创建一条资源。

    created_by 是当前登录用户的编号，
    用来记录是谁创建了这条资源。

    cohort_id 是资源所属届次编号；None 表示全局资源。
    """

    # by_alias=False 表示使用 Python 字段名。
    # 例如前端的 type 会转换成 resource_type。
    resource_values = data.model_dump(
        by_alias=False,
    )

    resource = Resource(
        **resource_values,
        created_by=created_by,
        updated_by=created_by,
        cohort_id=cohort_id,
    )

    db.add(resource)

    # 把资源写入数据库。
    await db.commit()

    # 读取数据库自动生成的 id 和时间。
    await db.refresh(resource)

    return resource


async def update_resource(
    db: AsyncSession,
    resource_id: int,
    data: ResourceUpdateRequest,
    updated_by: int | None = None,
) -> Resource | None:
    """
    修改一条资源。

    exclude_unset=True 表示只修改请求中真正传过来的字段，
    没有传的字段保持原值不变。
    """

    resource = await get_resource_by_id(
        db=db,
        resource_id=resource_id,
    )

    if resource is None:
        return None

    update_values = data.model_dump(
        exclude_unset=True,
        by_alias=False,
    )

    for field_name, field_value in update_values.items():
        # 文本字段统一去掉首尾空格。
        if isinstance(field_value, str):
            field_value = field_value.strip()

        setattr(resource, field_name, field_value)

    if updated_by is not None:
        resource.updated_by = updated_by

    await db.commit()
    await db.refresh(resource)

    return resource


async def delete_resource(
    db: AsyncSession,
    resource_id: int,
) -> bool:
    """
    删除一条资源。

    找到资源并删除返回 True，
    找不到返回 False。
    """

    resource = await get_resource_by_id(
        db=db,
        resource_id=resource_id,
    )

    if resource is None:
        return False

    await db.delete(resource)
    await db.commit()

    return True


async def increase_resource_views(
    db: AsyncSession,
    resource_id: int,
) -> Resource | None:
    """
    增加资源浏览量。

    浏览量只能由这个函数修改，
    不能让前端在创建或修改资源时直接提交 views。
    """

    resource = await get_resource_by_id(
        db=db,
        resource_id=resource_id,
    )

    if resource is None:
        return None

    resource.views += 1

    await db.commit()
    await db.refresh(resource)

    return resource
