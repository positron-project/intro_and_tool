"""
 @File : admin.py
 @Author : 加个真朋友
@Description : 
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.audit_logs import record_audit_log
from crud.members import (
    find_cohort_by_text,
    find_team_by_text,
    sync_member_for_user,
)
from models.members import Member
from models.users import User
from schemas.admin import AccountRoleUpdateRequest, AccountStatusUpdateRequest
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

    previous_status = target_user.status
    target_user.status = status_data.status

    if previous_status != status_data.status:
        status_actions = {
            "active": "恢复账号",
            "disabled": "禁用账号",
            "closed": "注销账号",
        }
        record_audit_log(
            db,
            actor_id=current_admin.id,
            actor_name=current_admin.nickname or current_admin.username,
            action=status_actions[status_data.status],
            resource_type="user",
            resource_id=str(target_user.id),
            target=target_user.nickname or target_user.username,
        )

    await db.commit()
    await db.refresh(target_user)

    return target_user


@router.patch(
    "/users/{user_id}/role",
    response_model=UserInfoResponse,
)
async def update_user_role(
    user_id: int,
    role_data: AccountRoleUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长修改账号权限和所属届次、小组。"""

    allowed_roles = {"Member", "Contributor", "CohortLeader", "Leader"}
    new_role = role_data.role.strip()

    if new_role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="账号角色只能是 Member、Contributor、CohortLeader 或 Leader",
        )

    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="不能在这里修改当前登录组长自己的权限",
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

    # PATCH 请求中未提交的字段保持原值；明确提交空值时才清除原分配。
    if "cohort" in role_data.model_fields_set:
        new_cohort = (role_data.cohort or "").strip() or None
    else:
        new_cohort = target_user.cohort

    if "direction" in role_data.model_fields_set:
        new_direction = (role_data.direction or "").strip() or None
    else:
        new_direction = target_user.direction

    # “全站”是展示用描述，不是数据库中的届次；真正的届次要来自组织表。
    if new_cohort in {"", "待分配", "全站"}:
        new_cohort = None

    cohort = await find_cohort_by_text(db, new_cohort)
    if new_cohort and cohort is None:
        raise HTTPException(
            status_code=400,
            detail="指定的届次不存在",
        )

    if new_role == "CohortLeader" and cohort is None:
        raise HTTPException(
            status_code=400,
            detail="届次负责人必须先分配届次",
        )

    unassigned_directions = {
        "待分配",
        "待补充",
        "全站内容",
        "成员与权限",
        "账号资料",
    }
    team = None
    if new_direction and new_direction not in unassigned_directions:
        if cohort is None:
            raise HTTPException(
                status_code=400,
                detail="分配小组前请先选择有效届次",
            )

        team = await find_team_by_text(db, cohort.id, new_direction)
        if team is None:
            raise HTTPException(
                status_code=400,
                detail="指定的小组不属于所选届次",
            )
        new_direction = team.name
    else:
        new_direction = None

    if new_role == "Contributor" and (cohort is None or team is None):
        raise HTTPException(
            status_code=400,
            detail="组员账号必须分配届次和所属小组",
        )

    previous_role = target_user.role
    previous_cohort = target_user.cohort
    previous_direction = target_user.direction
    target_user.role = new_role
    target_user.cohort = new_cohort
    target_user.direction = new_direction

    # 成员档案独立保存展示职务。同步账号资料和小组归属，但不覆盖已有展示职务。
    member_result = await db.execute(
        select(Member.id).where(Member.user_id == target_user.id)
    )
    member_exists = member_result.scalar_one_or_none() is not None
    if new_role != "Member" or member_exists:
        await sync_member_for_user(db, target_user)

    changed = (
        previous_role != new_role
        or previous_cohort != new_cohort
        or previous_direction != new_direction
    )
    if changed:
        record_audit_log(
            db,
            actor_id=current_admin.id,
            actor_name=current_admin.nickname or current_admin.username,
            action="修改账号权限",
            resource_type="user",
            resource_id=str(target_user.id),
            target=(
                f"{target_user.nickname or target_user.username} "
                f"(角色 {previous_role} -> {new_role}; "
                f"届次 {previous_cohort or '未分配'} -> {new_cohort or '未分配'}; "
                f"小组 {previous_direction or '未分配'} -> {new_direction or '未分配'})"
            ),
        )

    # 账号、关联成员资料和日志使用同一次提交，避免只更新成功一部分。
    await db.commit()
    await db.refresh(target_user)

    return target_user
