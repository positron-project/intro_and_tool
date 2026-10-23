"""项目、资源和内容使用的本地文件上传接口。"""

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from models.users import User
from models.upload_assets import UploadAsset
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

# 资源附件可以是文档、Markdown、压缩包或图片。这里按文件后缀判断，
# 因为浏览器对 .md、.doc 等文件给出的 content-type 并不稳定。
RESOURCE_ATTACHMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".zip", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp",
}
MAX_RESOURCE_ATTACHMENT_BYTES = 20 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_asset(
    request: Request,
    file: UploadFile = File(...),
    folder: str | None = Form(default=None),
    alt: str | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """保存登录用户上传的图片或资源附件，并返回可直接使用的地址。"""

    if folder == "cohort-photos" and current_user.role not in {"CohortLeader", "Leader", "Admin"}:
        raise HTTPException(status_code=403, detail="只有届次负责人或组长可以上传合影")

    is_resource_attachment = folder == "resources"
    if is_resource_attachment:
        extension = Path(file.filename or "").suffix.lower()
        if extension not in RESOURCE_ATTACHMENT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="资源附件支持 PDF、Office、ZIP、TXT、MD 和 PNG/JPG/WebP",
            )
        max_bytes = MAX_RESOURCE_ATTACHMENT_BYTES
    else:
        extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="只支持 PNG、JPG 或 WebP 图片",
            )
        max_bytes = MAX_IMAGE_BYTES

    # folder 只允许作为目录名使用，避免用户构造 ../ 访问服务器其他目录。
    safe_folder = folder if folder in {"projects", "cohort-photos", "resources"} else "general"
    target_directory = UPLOAD_ROOT / safe_folder
    target_directory.mkdir(parents=True, exist_ok=True)

    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="资源附件不能超过 20 MB" if is_resource_attachment else "图片大小不能超过 10 MB",
        )

    stored_name = f"{uuid4().hex}{extension}"
    target_path = target_directory / stored_name
    target_path.write_bytes(content)
    try:
        db.add(UploadAsset(id=stored_name, owner_id=current_user.id))
        await db.commit()
    except Exception:
        # 不向客户端返回一个未记录归属的文件。
        try:
            await db.rollback()
        finally:
            target_path.unlink(missing_ok=True)
        raise

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

    asset = await db.get(UploadAsset, asset_id)
    is_global_admin = current_user.role in {"Leader", "Admin"}
    if not is_global_admin and (asset is None or asset.owner_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己上传的文件；历史文件请联系组长处理",
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

    if asset is not None:
        await db.delete(asset)
        await db.commit()

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
