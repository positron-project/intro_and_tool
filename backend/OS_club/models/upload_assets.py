"""上传文件的归属记录；历史文件无记录时不推断上传者。"""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class UploadAsset(Base):
    __tablename__ = "upload_assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
