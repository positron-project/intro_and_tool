"""留言建议的公开提交和管理员管理接口。"""

from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
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
from utils.uploads import find_upload_path, upload_asset_id


FEEDBACK_UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads" / "feedback"
FEEDBACK_IMAGE_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
FEEDBACK_MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_feedback_attachments(attachments) -> None:
    """只接受本接口生成的 feedback 图片，避免把任意外链写进留言记录。"""

    for attachment in attachments:
        asset_id = upload_asset_id(attachment.asset_id or attachment.id or attachment.url)
        path = urlsplit(attachment.url).path
        if not asset_id or f"/uploads/feedback/{asset_id}" not in path or find_upload_path(asset_id) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="留言图片无效，请重新上传")


router = APIRouter(
    prefix="/api/feedback",
    tags=["feedback"],
)


@router.post("/attachments", status_code=status.HTTP_201_CREATED)
async def upload_feedback_attachment(
    request: Request,
    file: UploadFile = File(...),
):
    """上传留言截图；文件先进入临时目录，提交留言后才会被记录引用。"""

    extension = FEEDBACK_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="只支持 PNG、JPG 或 WebP 图片")

    content = await file.read(FEEDBACK_MAX_IMAGE_BYTES + 1)
    if len(content) > FEEDBACK_MAX_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="留言图片单张不能超过 5 MB")

    FEEDBACK_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{extension}"
    (FEEDBACK_UPLOAD_ROOT / stored_name).write_bytes(content)
    public_path = f"/uploads/feedback/{stored_name}"
    return {
        "id": stored_name,
        "assetId": stored_name,
        "url": str(request.base_url).rstrip("/") + public_path,
        "name": file.filename or stored_name,
        "mimeType": file.content_type,
        "size": len(content),
    }


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

    validate_feedback_attachments(feedback_data.attachments)
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
