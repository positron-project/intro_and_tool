"""检查并清理已经不再被业务记录使用的本地上传文件。"""

import logging
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.cohort_photos import CohortPhoto
from models.competitions import CompetitionProject
from models.feedback import FeedbackMessage
from models.members import Member
from models.projects import Project
from models.resource_submissions import ResourceSubmission
from models.resources import Resource
from models.site_settings import SiteSettings
from models.user_preferences import UserPreferences
from models.users import User


logger = logging.getLogger(__name__)
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_FOLDERS = ("projects", "cohort-photos", "feedback", "resources", "general")
UPLOAD_NAME_PATTERN = re.compile(r"^[a-f0-9]{32}\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx|zip|txt|md|png|jpg|jpeg|webp)$")


def upload_asset_id(value: str | None) -> str | None:
    """从上传 ID 或本地上传 URL 中取出安全的随机文件名。"""

    if not value:
        return None

    candidate = value.strip()
    if "/uploads/" in candidate:
        candidate = unquote(urlsplit(candidate).path).rsplit("/", 1)[-1]

    if not UPLOAD_NAME_PATTERN.fullmatch(candidate):
        return None
    return candidate


# 文件名里不允许出现的字符（Windows 与 POSIX 的并集）。
_INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def sanitize_filename(name: str | None, fallback: str = "download") -> str:
    """清洗下载文件名：去掉目录部分、非法字符和首尾空白。

    供 routers/uploads.py 的附件下载路由使用，保证 Content-Disposition
    里的文件名不会带 ../ 或 Windows 禁用字符。
    """

    value = (name or "").strip()
    if not value:
        return fallback

    # 有人会贴 "../../etc/passwd" 这种，先砍掉目录段。
    value = value.replace("\\", "/").rstrip("/").rsplit("/", 1)[-1]
    value = _INVALID_FILENAME_CHARS.sub("_", value).strip(" .")

    if not value or value in {".", ".."}:
        return fallback

    return value[:150]


def find_upload_path(asset_id: str) -> Path | None:
    """只在上传目录允许的子目录中查找文件。"""

    if not UPLOAD_NAME_PATTERN.fullmatch(asset_id):
        return None

    root = UPLOAD_ROOT.resolve()
    for folder in UPLOAD_FOLDERS:
        candidate = UPLOAD_ROOT / folder / asset_id
        if candidate.is_file() and candidate.resolve().parent == (root / folder).resolve():
            return candidate
    return None


def _contains_asset_reference(value, asset_id: str) -> bool:
    if isinstance(value, str):
        if value.strip() == asset_id:
            return True
        referenced_id = upload_asset_id(value)
        return referenced_id == asset_id
    if isinstance(value, dict):
        return any(_contains_asset_reference(item, asset_id) for item in value.values())
    if isinstance(value, list):
        return any(_contains_asset_reference(item, asset_id) for item in value)
    return False


async def is_upload_referenced(db: AsyncSession, asset_id: str) -> bool:
    """检查图片或附件是否仍被任一业务记录使用。"""

    fields_to_check = (
        (User.avatar_url,),
        (Member.avatar_url,),
        (Project.cover_image, Project.gallery_images, Project.download_url),
        (Resource.attachments, Resource.download_url, Resource.resource_url),
        (ResourceSubmission.attachments, ResourceSubmission.resource_url),
        (FeedbackMessage.attachments,),
        (CompetitionProject.image_url, CompetitionProject.image_asset_id),
        (CohortPhoto.data_url,),
        (SiteSettings.custom_background_asset_id,),
        (UserPreferences.custom_background_asset_id, UserPreferences.custom_background_url),
    )

    for fields in fields_to_check:
        result = await db.execute(select(*fields))
        for row in result.all():
            if any(_contains_asset_reference(value, asset_id) for value in row):
                return True
    return False


async def delete_upload_if_unused(db: AsyncSession, reference: str | None) -> bool:
    """删除已经脱离业务记录的本地上传文件；外链和仍在使用的文件不动。"""

    asset_id = upload_asset_id(reference)
    if asset_id is None or await is_upload_referenced(db, asset_id):
        return False

    target = find_upload_path(asset_id)
    if target is None:
        return False

    try:
        target.unlink()
        return True
    except OSError:
        logger.warning("Could not remove unused uploaded file: %s", target)
        return False
