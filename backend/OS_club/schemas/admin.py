
"""
 @File : admin.py
 @Author : 加个真朋友
@Description : 
"""
from pydantic import BaseModel, Field


class AccountStatusUpdateRequest(BaseModel):
    """
    管理员修改账号状态时提交的数据。
    """

    status: str


class AccountRoleUpdateRequest(BaseModel):
    """
    管理员修改账号角色时提交的数据。
    """

    # 账号权限：Member、Contributor、CohortLeader 或 Leader。
    role: str

    # 账号所属届次和方向；修改时可以一并提交。
    cohort: str | None = Field(default=None, max_length=20)
    direction: str | None = Field(default=None, max_length=50)
