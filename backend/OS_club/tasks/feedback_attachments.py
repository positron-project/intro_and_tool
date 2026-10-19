"""清理留言图片，避免临时截图长期占用服务器磁盘。"""

from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import select

from config.db_conf import SessionLocal
from models.feedback import FeedbackMessage
from utils.uploads import delete_upload_if_unused, upload_asset_id


FEEDBACK_ATTACHMENT_RETENTION_DAYS = 30
FEEDBACK_UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads" / "feedback"


async def cleanup_feedback_attachments(*, now: datetime | None = None) -> int:
    """清除已过期附件和无人提交的临时图片，正文记录继续保留。"""

    current_time = now or datetime.utcnow()
    cutoff = current_time - timedelta(days=FEEDBACK_ATTACHMENT_RETENTION_DAYS)
    references: list[str] = []

    async with SessionLocal() as db:
        result = await db.execute(
            select(FeedbackMessage).where(
                FeedbackMessage.attachments_expires_at.is_not(None),
                FeedbackMessage.attachments_expires_at <= current_time,
            )
        )
        expired_messages = result.scalars().all()
        for message in expired_messages:
            references.extend(
                item.get("assetId") or item.get("id") or item.get("url")
                for item in (message.attachments or [])
                if isinstance(item, dict)
            )
            message.attachments = []
            message.attachments_expires_at = None
        # 先提交“留言不再引用图片”的状态，再按统一的上传引用检查删除文件。
        await db.commit()

        if FEEDBACK_UPLOAD_ROOT.is_dir():
            for path in FEEDBACK_UPLOAD_ROOT.iterdir():
                if not path.is_file() or path.stat().st_mtime > cutoff.timestamp():
                    continue
                references.append(path.name)

        deleted = 0
        for reference in references:
            if upload_asset_id(reference) and await delete_upload_if_unused(db, reference):
                deleted += 1
        return deleted
