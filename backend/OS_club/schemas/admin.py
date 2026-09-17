
"""
 @File : admin.py
 @Author : 加个真朋友
@Description : 
"""
from pydantic import BaseModel


class AccountStatusUpdateRequest(BaseModel):
    """
    管理员修改账号状态时提交的数据。
    """

    status: str