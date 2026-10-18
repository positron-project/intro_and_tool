"""项目和内容使用的本地图片上传接口。"""

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from models.users import User
from utils.auth import get_current_user
from utils.uploads import find_upload_path, is_upload_referenced, sanitize_filename


router = APIRouter(
    prefix="/api/uploads",
    tags=["uploads"],
)

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    folder: str | None = Form(default=None),
    alt: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
):
    """保存登录用户上传的图片，并返回可直接展示的地址。"""

    if folder == "cohort-photos" and current_user.role not in {"CohortLeader", "Leader", "Admin"}:
        raise HTTPException(status_code=403, detail="只有届次负责人或组长可以上传合影")

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="只支持 PNG、JPG 或 WebP 图片",
        )

    # folder 只允许作为目录名使用，避免用户构造 ../ 访问服务器其他目录。
    safe_folder = folder if folder in {"projects", "cohort-photos"} else "general"
    target_directory = UPLOAD_ROOT / safe_folder
    target_directory.mkdir(parents=True, exist_ok=True)

    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="图片大小不能超过 10 MB",
        )

    stored_name = f"{uuid4().hex}{extension}"
    target_path = target_directory / stored_name
    target_path.write_bytes(content)

    public_path = f"/uploads/{safe_folder}/{stored_name}"
    return {
        "id": stored_name,
        "url": str(request.base_url).rstrip("/") + public_path,
        "name": file.filename or stored_name,
        "mimeType": file.content_type,
        "size": len(content),
        "alt": alt,
    }


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unused_upload(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """只删除数据库中已经没有内容引用的上传文件。"""

    target_path = find_upload_path(asset_id)
    if target_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="上传文件不存在",
        )

    if await is_upload_referenced(db, asset_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该文件仍被网站内容使用，暂时不能删除",
        )

    try:
        target_path.unlink()
    except OSError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="上传文件删除失败，请稍后重试",
        ) from error

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{asset_id}/download")
async def download_upload(
    asset_id: str,
    filename: str | None = Query(default=None, max_length=180),
):
    """以附件方式返回公开上传文件，让浏览器稳定执行下载而非内联预览。"""

    target_path = find_upload_path(asset_id)
    if target_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="上传文件不存在",
        )

    safe_filename = sanitize_filename(filename or target_path.name, fallback=target_path.name)
    return FileResponse(target_path, filename=safe_filename)
