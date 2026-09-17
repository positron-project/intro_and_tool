"""
 @File : email_codes.py
 @Author : 加个真朋友
@Description : 
"""
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    email: Mapped[str] = mapped_column(     #验证码发送到哪个邮箱
        String(255),
        nullable=False,
        index=True,
    )

    code: Mapped[str] = mapped_column(      #六位验证码
        String(6),
        nullable=False,
    )

    purpose: Mapped[str] = mapped_column(       #验证码用途：register 或 login
        String(20),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(       #过期时间
        DateTime,
        nullable=False,
    )

    used_at: Mapped[datetime | None] = mapped_column(       #使用时间，未使用时为 NULL
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(       #创建时间
        DateTime,
        server_default=func.now(),
        nullable=False,
    )


"""
示例：
    email: test@example.com
    code: 482913
    purpose: register
    expires_at: 2026-09-14 23:10:00
    used_at: NULL
"""