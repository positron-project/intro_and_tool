"""操作日志的新增、查询和删除操作。"""

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.audit_logs import AuditLog


def record_audit_log(
    db: AsyncSession,
    *,
    actor_id: int,
    actor_name: str,
    action: str,
    resource_type: str,
    resource_id: str | None,
    target: str,
) -> None:
    """把日志加入当前事务，由原业务操作统一 commit。"""

    db.add(
        AuditLog(
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            target=target[:255],
            result="success",
        )
    )


async def list_audit_logs(
    db: AsyncSession,
    *,
    page: int,
    page_size: int,
    actor_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[AuditLog]:
    """按时间倒序读取日志；筛选条件都是可选的。"""

    statement = select(AuditLog)

    if actor_id is not None:
        statement = statement.where(AuditLog.actor_id == actor_id)
    if action:
        statement = statement.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    if resource_type:
        statement = statement.where(AuditLog.resource_type == resource_type)
    if from_date is not None:
        statement = statement.where(AuditLog.created_at >= from_date)
    if to_date is not None:
        statement = statement.where(AuditLog.created_at <= to_date)

    statement = statement.order_by(
        AuditLog.created_at.desc(),
        AuditLog.id.desc(),
    )
    statement = statement.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(statement)
    return list(result.scalars().all())


async def get_audit_log(db: AsyncSession, log_id: int) -> AuditLog | None:
    """根据日志编号读取单条记录。"""

    return await db.get(AuditLog, log_id)


async def delete_audit_log(
    db: AsyncSession,
    log_id: int,
):
    """立即删除一条日志，提交由调用接口统一处理。"""

    result = await db.execute(delete(AuditLog).where(AuditLog.id == log_id))
    return max(result.rowcount or 0, 0)


async def delete_all_audit_logs(db: AsyncSession) -> int:
    """立即清空全部日志，提交由调用接口统一处理。"""

    result = await db.execute(delete(AuditLog))
    return max(result.rowcount or 0, 0)
