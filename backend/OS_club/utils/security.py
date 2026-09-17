"""
 @File : security.py.py
 @Author : 加个真朋友
@Description : 
"""
from pwdlib import PasswordHash


password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:    #把明文密码加密，注册和修改密码时使用。
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool: #把用户登录时输入的密码和数据库里的加密结果进行验证，登录时使用。
    return password_hasher.verify(password, password_hash)