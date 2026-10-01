"""留言建议的公开提交和管理员管理接口。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.feedback import (
    create_feedback_message,
    delete_feedback_message,
    get_feedback_message,
    list_feedback_messages,
    update_feedback_message,
)
from models.users import User
from schemas.feedback import (
    FeedbackCreateRequest,
    FeedbackResponse,
    FeedbackStatus,
    FeedbackUpdateRequest,
)
from utils.auth import require_leader_or_admin


router = APIRouter(
    prefix="/api/feedback",
    tags=["feedback"],
)


@router.post(
    "",
    response_model=FeedbackResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def submit_feedback(
    feedback_data: FeedbackCreateRequest,
    db: AsyncSession = Depends(get_database),
):
    """访客和成员都可以提交建议，不要求先登录。"""

    return await create_feedback_message(db, feedback_data)


@router.get(
    "",
    response_model=list[FeedbackResponse],
    response_model_exclude_none=True,
)
async def get_feedback_messages(
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
    feedback_status: Annotated[
        FeedbackStatus | None,
        Query(alias="status"),
    ] = None,
    category: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=100),
):
    """组长或管理员按条件查看留言；普通成员不能读取他人留言。"""

    return await list_feedback_messages(
        db,
        status_filter=feedback_status,
        category=category,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{feedback_id}",
    response_model=FeedbackResponse,
    response_model_exclude_none=True,
)
async def get_feedback_detail(
    feedback_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或管理员读取一条留言的详情。"""

    message = await get_feedback_message(db, feedback_id)
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="留言建议不存在",
        )
    return message


@router.patch(
    "/{feedback_id}",
    response_model=FeedbackResponse,
    response_model_exclude_none=True,
)
async def edit_feedback(
    feedback_id: int,
    feedback_data: FeedbackUpdateRequest,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或管理员标记已查看/已处理，或更新处理说明。"""

    message = await update_feedback_message(db, feedback_id, feedback_data)
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="留言建议不存在",
        )
    return message


@router.delete(
    "/{feedback_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_feedback(
    feedback_id: int,
    current_admin: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    """组长或管理员明确删除一条留言。"""

    message = await get_feedback_message(db, feedback_id)
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="留言建议不存在",
        )
    if message.status != "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有已处理的留言建议可以清理",
        )

    deleted = await delete_feedback_message(db, feedback_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="留言建议不存在",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
