"""
 @File : users.py
 @Author : 加个真朋友
@Description : 
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from config.db_conf import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    username: Mapped[str] = mapped_column(
        String(32),     #用户名，不能重复，不能为空
        unique=True,    #邮箱，不能重复，不能为空；
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    nickname: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    avatar_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    bio: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # 用户角色：
    # Member      普通成员
    # Contributor 组员
    # CohortLeader 届次负责人，只管理所负责届次
    # Leader      组长
    # Admin       旧版组长别名，保留用于兼容已有账号
    role: Mapped[str] = mapped_column(  #判断用户能访问和管理什么内容。
        String(20),
        default="Member",
        server_default="Member",
        nullable=False,
    )

    # 账号状态：
    # active   正常
    # disabled 禁用
    # closed   注销
    status: Mapped[str] = mapped_column(    #判断账号是否还能登录。
        String(20),
        default="active",
        server_default="active",
        nullable=False,
    )

    # 所属届次，例如 "2029"。
    # 刚注册但还没有分配届次时允许为空。
    cohort: Mapped[str | None] = mapped_column(     #判断用户属于哪一届，方便管理员按届次管理。
        String(20),
        nullable=True,
    )

    # 所属方向，例如“算法组”“项目组”“网安组”。
    direction: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),    #保存加密后的密码，不能保存明文密码
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(), #用户创建时间，由数据库自动生成。
        nullable=False,
    )





class UserToken(Base):
    __tablename__ = "user_tokens"

    id: Mapped[int] = mapped_column( #令牌记录自己的编号
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column( #这个令牌属于哪个用户
        ForeignKey("users.id"), ## 外键关联 users表的id 比如user_id=1 代表这条 token 记录，是 id=1 的用户的登录令牌
        nullable=False,
        index=True,
    )

    token: Mapped[str] = mapped_column( #登录成功后生成的随机字符串
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column( #令牌什么时候失效
        DateTime,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column( #令牌什么时候创建
        DateTime,
        server_default=func.now(),
        nullable=False,
    )



