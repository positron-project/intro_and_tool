"""项目、资源和面经分类数据库操作。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.content_categories import ContentCategory
from models.projects import Project
from schemas.content_categories import (
    ContentCategoryCreateRequest,
    ContentCategoryUpdateRequest,
)


async def list_categories(
    db: AsyncSession,
    resource: str,
) -> list[ContentCategory]:
    """按内容模块返回分类，按 order 从小到大排列。"""

    result = await db.execute(
        select(ContentCategory).where(
            ContentCategory.resource == resource,
        ).order_by(
            ContentCategory.sort_order.asc(),
            ContentCategory.id.asc(),
        )
    )
    return list(result.scalars().all())


async def get_category_by_id(
    db: AsyncSession,
    category_id: int,
) -> ContentCategory | None:
    """根据分类编号查询分类。"""

    return await db.get(ContentCategory, category_id)


async def create_category(
    db: AsyncSession,
    data: ContentCategoryCreateRequest,
) -> ContentCategory:
    """创建自定义分类。"""

    existing = await db.scalar(
        select(ContentCategory).where(
            ContentCategory.resource == data.resource,
            ContentCategory.category_key == data.key.strip(),
        )
    )
    if existing is not None:
        raise ValueError("这个模块已经存在相同的分类 key")

    category = ContentCategory(
        resource=data.resource,
        category_key=data.key.strip(),
        label=data.label.strip(),
        description=data.description.strip() if data.description else None,
        accent=data.accent.strip(),
        icon=data.icon.strip(),
        sort_order=data.order,
        enabled=data.enabled,
        built_in=False,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(
    db: AsyncSession,
    category_id: int,
    data: ContentCategoryUpdateRequest,
) -> ContentCategory | None:
    """修改分类的显示信息、顺序或启用状态。"""

    category = await get_category_by_id(db, category_id)
    if category is None:
        return None

    values = data.model_dump(exclude_unset=True, by_alias=False)
    next_key = values.get("key")
    if next_key is not None:
        next_key = next_key.strip()
        duplicate = await db.scalar(
            select(ContentCategory).where(
                ContentCategory.resource == category.resource,
                ContentCategory.category_key == next_key,
                ContentCategory.id != category.id,
            )
        )
        if duplicate is not None:
            raise ValueError("这个模块已经存在相同的分类 key")
        values["key"] = next_key

    for field_name, field_value in values.items():
        if isinstance(field_value, str):
            field_value = field_value.strip()
        if field_name == "key":
            field_name = "category_key"
        elif field_name == "order":
            field_name = "sort_order"
        setattr(category, field_name, field_value)

    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(
    db: AsyncSession,
    category_id: int,
) -> bool:
    """删除未被项目使用的自定义分类。"""

    category = await get_category_by_id(db, category_id)
    if category is None:
        return False

    if category.built_in:
        raise ValueError("内置分类不能删除")

    if category.resource == "projects":
        used_project = await db.scalar(
            select(Project.id).where(
                Project.category == category.category_key,
            ).limit(1)
        )
        if used_project is not None:
            raise ValueError("这个分类仍被项目使用，不能删除")

    await db.delete(category)
    await db.commit()
    return True
