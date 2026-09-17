"""
 @File : admin.py
 @Author : 加个真朋友
@Description : 
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from models.users import User
from schemas.admin import AccountStatusUpdateRequest
from schemas.users import UserInfoResponse
from utils.auth import require_leader_or_admin

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
)


@router.get(
    "/users",
    response_model=list[UserInfoResponse],
)
async def list_managed_users(
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    获取账号列表。

    只有 Leader 或 Admin 可以访问。
    """

    result = await db.execute(
        select(User).order_by(User.id.desc())   #表示查询所有用户，并按照用户编号从新到旧排列。
    )

    return result.scalars().all()

"""
current_admin: User = Depends(require_leader_or_admin)
表示请求接口前，FastAPI 会先执行管理员权限判断：
1. 检查有没有登录。
2. 检查账号状态是不是 active。
3. 检查角色是不是 Leader 或 Admin
"""




@router.patch(
    "/users/{user_id}/status",
    response_model=UserInfoResponse,
)
async def update_user_status(
    user_id: int,
    status_data: AccountStatusUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    修改指定用户的账号状态。

    active：正常
    disabled：禁用
    closed：注销
    """

    allowed_statuses = {"active", "disabled", "closed"}

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="账号状态只能是 active、disabled 或 closed",
        )

    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="不能修改当前登录管理员自己的账号状态",
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    target_user = result.scalar_one_or_none()

    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="用户不存在",
        )

    target_user.status = status_data.status

    await db.commit()
    await db.refresh(target_user)

    return target_user
