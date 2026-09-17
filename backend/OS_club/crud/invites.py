"""
 @File : invites.py
 @Author : 加个真朋友
@Description : 邀请码数据库操作
"""
import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.invites import InviteCode
from models.users import User


# 排除容易看错的字符，例如 0、O、1、I。
INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_invite_code_part(length: int = 4) -> str:
    """
    生成一段随机邀请码。

    例如：
    A7K2
    """
    return "".join(
        secrets.choice(INVITE_CODE_ALPHABET)
        for _ in range(length)
    )


def generate_invite_code() -> str:
    """
    生成完整的邀请码。

    例如：
    OS-A7K2-9QPL
    """
    return (
        f"OS-"
        f"{generate_invite_code_part()}-"
        f"{generate_invite_code_part()}"
    )


async def create_invite_code(
    db: AsyncSession,
    expires_at: datetime,
    max_uses: int,
    created_by: int,
    role: str = "Contributor",
) -> InviteCode:
    """
    创建邀请码并保存到数据库。

    参数说明：
    expires_at：邀请码过期时间
    max_uses：最大使用次数
    created_by：创建者的用户编号
    role：兑换后获得的角色
    """

    invite_code = InviteCode(
        code=generate_invite_code(),
        expires_at=expires_at,
        max_uses=max_uses,
        used_count=0,
        created_by=created_by,
        role=role,
    )

    db.add(invite_code)

    # 只有 commit 后，数据才真正写入数据库。
    await db.commit()

    # 重新读取数据库生成的 id 和 created_at。
    await db.refresh(invite_code)

    return invite_code


async def list_invite_codes(
    db: AsyncSession,
) -> list[InviteCode]:
    """
    查询全部邀请码，最新创建的排在前面。
    """

    result = await db.execute(
        select(InviteCode).order_by(
            InviteCode.created_at.desc()
        )
    )

    return list(result.scalars().all())


async def get_invite_code_by_id(
    db: AsyncSession,
    invite_id: int,
) -> InviteCode | None:
    """
    根据邀请码编号查询邀请码。
    """

    result = await db.execute(
        select(InviteCode).where(
            InviteCode.id == invite_id
        )
    )

    return result.scalar_one_or_none()


async def revoke_invite_code(
    db: AsyncSession,
    invite_id: int,
) -> InviteCode | None:
    """
    撤销邀请码。

    撤销不是删除数据，而是记录 revoked_at。
    这样以后还能查看这个邀请码的历史记录。
    """

    invite_code = await get_invite_code_by_id(
        db,
        invite_id,
    )

    if invite_code is None:
        return None

    if invite_code.revoked_at is None:
        invite_code.revoked_at = datetime.now()

        await db.commit()
        await db.refresh(invite_code)

    return invite_code


async def redeem_invite_code(
    db: AsyncSession,
    code: str,
    user: User,
) -> InviteCode:
    """
    兑换邀请码，并把当前用户升级为邀请码指定的角色。

    这个函数会同时完成：
    1. 查询邀请码
    2. 检查邀请码是否有效
    3. 增加使用次数
    4. 修改当前用户角色
    5. 一起提交数据库
    """

    normalized_code = code.strip().upper()

    if not normalized_code:
        raise ValueError("请输入邀请码")

    # 加锁查询，避免多个用户同时兑换时超出最大使用次数。
    result = await db.execute(
        select(InviteCode)
        .where(InviteCode.code == normalized_code)
        .with_for_update()
    )

    invite_code = result.scalar_one_or_none()

    if invite_code is None:
        raise ValueError("邀请码不存在")

    if invite_code.revoked_at is not None:
        raise ValueError("邀请码已被撤销")

    if invite_code.expires_at <= datetime.now():
        raise ValueError("邀请码已过期")

    if invite_code.used_count >= invite_code.max_uses:
        raise ValueError("邀请码使用次数已用完")

    if user.status != "active":
        raise ValueError("当前账号不可用")

    if user.role != "Member":
        raise ValueError("当前账号无需重复兑换")

    # 增加邀请码使用次数。
    invite_code.used_count += 1

    # 把普通成员升级为邀请码指定的角色。
    user.role = invite_code.role

    # 邀请码和用户角色一起保存。
    await db.commit()

    await db.refresh(invite_code)
    await db.refresh(user)

    return invite_code
