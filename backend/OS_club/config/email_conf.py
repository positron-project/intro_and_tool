"""读取第三方邮件 API 的地址和发件人信息。"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]


class EmailSettings(BaseSettings):
    """邮件服务配置；此处不保存或打印邮件验证码。"""

    # 默认值沿用学习目录 email_api.py 中的第三方 API 地址。
    mail_api_url: str = "https://mail-api.twoword.cfd/api/v1/emails"
    mail_from_name: str = "南航计算机科技小组"
    mail_from_email: str = "no_reply@stcnchu.com"

    model_config = SettingsConfigDict(
        # 从后端自己的 .env 读取覆盖值，不依赖前端或当前工作目录。
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_email_settings() -> EmailSettings:
    """整个进程复用同一份邮件服务配置。"""

    return EmailSettings()
