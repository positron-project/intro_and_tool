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
