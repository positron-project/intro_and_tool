"""
 @File : invites.py
 @Author : 加个真朋友
@Description : 邀请码数据库操作
"""
import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from crud.members import sync_member_for_user
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
    created_by_name: str,
    role: str = "Contributor",
    cohort: str | None = None,
    direction: str | None = None,
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
        cohort=cohort.strip() if cohort else None,
        direction=direction.strip() if direction else None,
    )

    db.add(invite_code)
    await db.flush()

    # 不把邀请码内容写入日志，避免把可兑换凭证泄露给日志查看者。
    record_audit_log(
        db,
        actor_id=created_by,
        actor_name=created_by_name,
        action="创建邀请码",
        resource_type="invite",
        resource_id=str(invite_code.id),
        target=f"邀请码 #{invite_code.id}",
    )

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
    actor_id: int,
    actor_name: str,
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
        record_audit_log(
            db,
            actor_id=actor_id,
            actor_name=actor_name,
            action="撤销邀请码",
            resource_type="invite",
            resource_id=str(invite_code.id),
            target=f"邀请码 #{invite_code.id}",
        )

        await db.commit()
        await db.refresh(invite_code)

    return invite_code


async def delete_invite_code(
    db: AsyncSession,
    invite_id: int,
    actor_id: int,
    actor_name: str,
) -> bool:
    """
    永久删除一个已经失效的邀请码。

    有效邀请码不能直接删除，必须先撤销，避免管理员误删一张
    仍然可以被用户兑换的邀请码。撤销、过期或使用次数耗尽后，
    管理员才可以清理数据库记录。
    """

    invite_code = await get_invite_code_by_id(
        db,
        invite_id,
    )

    if invite_code is None:
        return False

    is_active = (
        invite_code.revoked_at is None
        and invite_code.expires_at > datetime.now()
        and invite_code.used_count < invite_code.max_uses
    )

    if is_active:
        raise ValueError("有效邀请码不能直接删除，请先撤销")

    record_audit_log(
        db,
        actor_id=actor_id,
        actor_name=actor_name,
        action="删除失效邀请码",
        resource_type="invite",
        resource_id=str(invite_code.id),
        target=f"邀请码 #{invite_code.id}",
    )
    await db.delete(invite_code)
    await db.commit()

    return True


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
    if invite_code.cohort:
        user.cohort = invite_code.cohort
    if invite_code.direction:
        user.direction = invite_code.direction

    # 同步成员目录。
    #
    # 这一步会根据 user_id 创建或更新 members 记录，
    # 让管理员成员列表和前台小组风采都能看到这个用户。
    # sync_member_for_user 只执行 flush，不单独 commit，
    # 因此下面的 commit 会把邀请码、用户和成员档案一起提交。
    await sync_member_for_user(
        db=db,
        user=user,
    )

    record_audit_log(
        db,
        actor_id=user.id,
        actor_name=user.nickname or user.username,
        action="使用邀请码加入组员",
        resource_type="user",
        resource_id=str(user.id),
        target=user.nickname or user.username,
    )

    # 邀请码、用户角色和成员档案一起保存。
    await db.commit()

    await db.refresh(invite_code)
    await db.refresh(user)

    return invite_code
