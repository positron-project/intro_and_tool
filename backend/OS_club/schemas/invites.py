"""
 @File : invites.py
 @Author : 加个真朋友
@Description : 邀请码接口数据模型
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InviteCodeCreateRequest(BaseModel):
    """
    创建邀请码时接收的数据。
    """

    # 邀请码过期时间
    expires_at: datetime = Field(
        alias="expiresAt",
    )

    # 最大使用次数，限制为 1 到 999
    max_uses: int = Field(
        alias="maxUses",
        ge=1,
        le=999,
    )

    # 使用邀请码后获得的角色
    role: str = "Contributor"

    # Every new invite must carry its target cohort and direction so a
    # successful redemption can immediately enter the correct group.
    cohort: str = Field(
        min_length=1,
        max_length=20,
    )
    direction: str = Field(
        min_length=1,
        max_length=50,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class InviteCodeResponse(BaseModel):
    """
    返回给前端的邀请码信息。
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: int
    code: str
    role: str

    cohort: str | None = None
    direction: str | None = None

    expires_at: datetime = Field(
        alias="expiresAt",
    )

    max_uses: int = Field(
        alias="maxUses",
    )

    used_count: int = Field(
        alias="usedCount",
    )

    created_by: int = Field(
        alias="createdBy",
    )

    revoked_at: datetime | None = Field(
        default=None,
        alias="revokedAt",
    )

    created_at: datetime = Field(
        alias="createdAt",
    )


class InviteCodeRedeemRequest(BaseModel):
    """
    普通用户兑换邀请码时提交的数据。
    """

    # Python 代码中使用 invite_code，
    # 前端 JSON 使用 inviteCode。
    invite_code: str = Field(   #接收用户输入的邀请码。
        min_length=1,       #不允许提交空字符串
        max_length=32,      #限制邀请码长度。
        alias="inviteCode",     #匹配前端发送的字段名。
    )

    # 允许使用字段名 invite_code 或别名 inviteCode。
    model_config = ConfigDict(
        populate_by_name=True,
    )
