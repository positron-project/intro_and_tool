"""当前登录用户的站内通知接口。"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.notifications import (
    active_pending_notification_ids,
    count_user_unread_notifications,
    delete_read_user_notifications,
    delete_user_notification,
    list_user_notifications,
    mark_all_user_notifications_read,
    mark_user_notification_read,
)
from models.users import User
from schemas.notifications import (
    NotificationPageResponse,
    NotificationDeleteReadResponse,
    NotificationReadAllResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from utils.auth import get_current_user


router = APIRouter(
    prefix="/api/notifications",
    tags=["notifications"],
)


@router.get("", response_model=NotificationPageResponse)
async def get_my_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    unread_only: bool = Query(default=False, alias="unreadOnly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """分页读取当前登录用户的通知。"""

    notifications, total = await list_user_notifications(
        db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        unread_only=unread_only,
    )
    actionable_ids = await active_pending_notification_ids(db, notifications)
    return NotificationPageResponse(
        items=[
            NotificationResponse.model_validate(item).model_copy(
                update={"is_actionable": item.id in actionable_ids}
            )
            for item in notifications
        ],
        total=total,
        page=page,
        pageSize=page_size,
    )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
async def get_my_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """读取当前登录用户的未读通知数量。"""

    unread_count = await count_user_unread_notifications(db, current_user.id)
    return NotificationUnreadCountResponse(unreadCount=unread_count)


@router.post("/read-all", response_model=NotificationReadAllResponse)
async def read_all_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """将当前用户的全部未读通知标记为已读。"""

    updated_count = await mark_all_user_notifications_read(db, current_user.id)
    return NotificationReadAllResponse(updatedCount=updated_count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def read_my_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """将当前用户的一条通知标记为已读。"""

    notification = await mark_user_notification_read(
        db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )
    return NotificationResponse.model_validate(notification)


@router.delete("/read", response_model=NotificationDeleteReadResponse)
async def remove_read_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """批量删除已读消息，但仍待处理的审核通知会保留。"""

    deleted_count = await delete_read_user_notifications(db, current_user.id)
    return NotificationDeleteReadResponse(deletedCount=deleted_count)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_my_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """删除当前用户自己的通知。"""

    try:
        deleted = await delete_user_notification(
            db,
            notification_id=notification_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
