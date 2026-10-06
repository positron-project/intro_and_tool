"""
 @File : invites.py
 @Author : 加个真朋友
@Description : 邀请码接口
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.invites import (
    create_invite_code as create_invite_code_record,
    delete_invite_code as delete_invite_code_record,
    list_invite_codes as list_invite_code_records,
    revoke_invite_code as revoke_invite_code_record,
)
from models.users import User
from schemas.invites import InviteCodeCreateRequest, InviteCodeResponse
from utils.auth import require_leader_or_admin


router = APIRouter(
    prefix="/api/admin/invites",
    tags=["admin-invites"],
)


@router.get(
    "",
    response_model=list[InviteCodeResponse],
)
async def list_invites(
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    获取邀请码列表。

    只有组长或管理员可以查看。
    """

    return await list_invite_code_records(db)


@router.post(
    "",
    response_model=InviteCodeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_invite(
    invite_data: InviteCodeCreateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    创建一个 Contributor 邀请码。
    """

    # 当前系统的邀请码只用于授予 Contributor 组员身份，
    # 不能让请求体把普通成员直接升级为 Leader 或 Admin。
    if invite_data.role != "Contributor":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前邀请码只能用于生成 Contributor 组员身份",
        )

    # 前端发送的时间通常带有时区，例如 2026-09-30T12:00:00Z。
    # 数据库当前使用不带时区的 DATETIME，因此转换为服务器本地时间。
    expires_at = invite_data.expires_at
    if expires_at.tzinfo is not None:
        expires_at = expires_at.astimezone().replace(tzinfo=None)

    if expires_at <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邀请码过期时间必须晚于当前时间",
        )

    return await create_invite_code_record(
        db=db,
        expires_at=expires_at,
        max_uses=invite_data.max_uses,
        created_by=current_admin.id,
        created_by_name=current_admin.nickname or current_admin.username,
        role=invite_data.role,
        cohort=invite_data.cohort,
        direction=invite_data.direction,
    )


@router.post(
    "/{invite_id}/revoke",
    response_model=InviteCodeResponse,
)
async def revoke_invite(
    invite_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    撤销邀请码。

    撤销后不删除数据库记录，只填写 revoked_at。
    """

    invite_code = await revoke_invite_code_record(
        db=db,
        invite_id=invite_id,
        actor_id=current_admin.id,
        actor_name=current_admin.nickname or current_admin.username,
    )

    if invite_code is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀请码不存在",
        )

    return invite_code


@router.delete(
    "/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_invite(
    invite_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """
    永久删除已经失效的邀请码。

    有效邀请码需要先调用撤销接口，撤销后才允许清理记录。
    """

    try:
        deleted = await delete_invite_code_record(
            db=db,
            invite_id=invite_id,
            actor_id=current_admin.id,
            actor_name=current_admin.nickname or current_admin.username,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀请码不存在",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
