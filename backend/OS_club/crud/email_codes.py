"""邮箱验证码的生成和数据库操作。"""

import secrets
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.email_codes import EmailVerificationCode


#两个全局常量，用于控制验证码的有效期和发送频率
EMAIL_CODE_EXPIRE_MINUTES = 10      ## 验证码有效期：10分钟
EMAIL_CODE_COOLDOWN_SECONDS = 60        ## 冷却时间：同一邮箱60秒内只能发一次


def generate_email_code() -> str:
    """生成六位验证码，并保留可能出现的开头零。"""

    return f"{secrets.randbelow(1_000_000):06d}"


async def create_email_verification_code(
    db: AsyncSession,
    email: str,     #收件人的邮箱地址
    purpose: str,   #用途，比如 "register"（注册）或 "reset_password"（找回密码
) -> EmailVerificationCode:
    """生成验证码记录并保存到数据库。"""

    verification_code = EmailVerificationCode(
        email=email,  # 存谁的邮箱
        code=generate_email_code(),  # 刚生成的6位验证码
        purpose=purpose,  # 这验证码用来干嘛的
        expires_at=datetime.now() + timedelta(minutes=EMAIL_CODE_EXPIRE_MINUTES),  # 10分钟后过期
        used_at=None,  # 还没被用过，所以是空
    )

    db.add(verification_code)
    await db.commit()
    await db.refresh(verification_code)
    return verification_code


async def has_recent_email_verification_code(
    db: AsyncSession,
    email: str,
    purpose: str,
) -> bool:
    """检查同一邮箱和用途是否在冷却时间内请求过验证码。"""

    cooldown_start = datetime.now() - timedelta(
        seconds=EMAIL_CODE_COOLDOWN_SECONDS,
    )
    recent_code_id = await db.scalar(
        select(EmailVerificationCode.id).where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.created_at >= cooldown_start,
        ).limit(1)
    )
    return recent_code_id is not None


async def expire_email_verification_code(
    db: AsyncSession,
    verification_code: EmailVerificationCode,
) -> None:
    """邮件发送失败时立即让刚生成的验证码失效。"""

    verification_code.expires_at = datetime.now()
    await db.commit()


async def consume_latest_email_verification_code(
    db: AsyncSession,
    email: str,
    code: str,
    purpose: str,
) -> bool:
    """核验最新验证码并在当前事务中标记为已使用，由调用方提交事务。"""

    now = datetime.now()
    latest_code_id = await db.scalar(
        select(EmailVerificationCode.id)
        .where(
            EmailVerificationCode.email == email,
            EmailVerificationCode.purpose == purpose,
        )
        .order_by(
            EmailVerificationCode.created_at.desc(),
            EmailVerificationCode.id.desc(),
        )
        .limit(1)
    )
    if latest_code_id is None:
        return False

    result = await db.execute(
        update(EmailVerificationCode)
        .where(
            EmailVerificationCode.id == latest_code_id,
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.expires_at > now,
            EmailVerificationCode.used_at.is_(None),
        )
        .values(used_at=now)
    )
    return result.rowcount == 1
