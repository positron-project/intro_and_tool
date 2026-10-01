"""组长和管理员读取、删除操作日志的接口。"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.audit_logs import delete_all_audit_logs, delete_audit_log, get_audit_log, list_audit_logs
from models.users import User
from schemas.audit_logs import AuditLogActionResponse, AuditLogResponse
from utils.auth import require_leader_or_admin


router = APIRouter(prefix="/api/admin/audit-logs", tags=["admin-audit-logs"])


def database_datetime(value: datetime | None) -> datetime | None:
    """MySQL DATETIME 不带时区，查询条件也转换成服务器本地时间。"""

    if value is not None and value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)
    return value


@router.get("", response_model=list[AuditLogResponse])
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=100),
    actor_id: int | None = Query(default=None, alias="actorId", ge=1),
    action: str | None = Query(default=None, max_length=100),
    resource_type: str | None = Query(default=None, alias="resourceType", max_length=50),
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """读取操作日志，最多一次返回 100 条。"""

    from_date = database_datetime(from_date)
    to_date = database_datetime(to_date)
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="开始时间不能晚于结束时间",
        )

    return await list_audit_logs(
        db,
        page=page,
        page_size=page_size,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        from_date=from_date,
        to_date=to_date,
    )


@router.delete("", response_model=AuditLogActionResponse)
async def delete_all_logs(
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """立即清空全部操作日志，不额外新增删除记录。"""

    deleted_count = await delete_all_audit_logs(db)
    await db.commit()
    return {"affected_count": deleted_count}


@router.delete("/{log_id}", response_model=AuditLogActionResponse)
async def delete_one_log(
    log_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """立即删除一条操作日志，不额外新增删除记录。"""

    deleted_count = await delete_audit_log(db, log_id)
    if not deleted_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="操作日志不存在",
        )
    await db.commit()
    return {"affected_count": deleted_count}


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log_detail(
    log_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """读取一条日志详情。"""

    audit_log = await get_audit_log(db, log_id)
    if audit_log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="操作日志不存在",
        )
    return audit_log
