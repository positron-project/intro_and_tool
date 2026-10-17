"""邮箱地址校验类型。"""

from typing import Annotated

from pydantic import AfterValidator, EmailStr


SUPPORTED_EMAIL_DOMAINS = frozenset({"gmail.com", "qq.com", "163.com"})


def validate_supported_email_domain(email: str) -> str:
    domain = email.rsplit("@", 1)[-1].lower()
    if domain not in SUPPORTED_EMAIL_DOMAINS:
        raise ValueError("目前仅支持 Gmail、QQ 邮箱和 163 邮箱注册")
    return email


SupportedRegistrationEmail = Annotated[
    EmailStr,
    AfterValidator(validate_supported_email_domain),
]
