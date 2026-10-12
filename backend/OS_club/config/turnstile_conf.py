"""读取 Cloudflare Turnstile 的后端配置。"""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[1]  # 当前配置文件位于后端目录的 config 子目录中。


class TurnstileSettings(BaseSettings):
    """保存核验 Turnstile 时需要的密钥。"""

    # 自动对应后端 .env 中的 TURNSTILE_SECRET_KEY。
    turnstile_secret_key: SecretStr

    # 邮件和 Turnstile 共用后端 .env，因此忽略本配置类不使用的其他变量。
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_turnstile_settings() -> TurnstileSettings:
    """读取并缓存 Turnstile 配置。"""

    return TurnstileSettings()
