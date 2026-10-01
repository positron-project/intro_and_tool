"""届次合影的说明信息；图片文件本身保存在 uploads 目录。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class CohortPhoto(Base):
    """保存图片 URL、所属届次、说明以及是否为前台封面。"""

    __tablename__ = "cohort_photos"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True)
    data_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    caption: Mapped[str] = mapped_column(String(255), nullable=False)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
