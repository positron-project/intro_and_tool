"""
 @File : turnstile.py
 @Author : 加个真朋友
@Description :
"""
import asyncio
import json
import logging
import time
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from config.turnstile_conf import get_turnstile_settings

logger = logging.getLogger(__name__)

# 本项目没有配置 logging.basicConfig，root logger 没有 handler，
# INFO 级日志会被丢弃（只剩 lastResort 的 WARNING）。这里给本模块单独挂一个
# stderr handler，保证核验耗时与拒绝原因能进 journald。
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [turnstile] %(message)s")
    )
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

# Cloudflare 用这个地址核验浏览器取得的 Turnstile token。
SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

# siteverify 的等待上限。必须明显小于前端的登录超时（25 秒），
# 否则网络抖动时前端会先掐断请求，用户只能看到浏览器的英文超时错误。
SITEVERIFY_TIMEOUT_SECONDS = 6


class TurnstileVerificationError(RuntimeError):
    """无法联系 Cloudflare，或 Cloudflare 返回了无法识别的数据。"""


def _verify_turnstile_token_sync(token: str) -> bool:
    """同步发送核验请求；由下面的异步函数放入工作线程调用。"""

    settings = get_turnstile_settings()

    # Siteverify 接收 Secret Key 和浏览器传来的 token。
    form_data = urlencode(
        {
            "secret": settings.turnstile_secret_key.get_secret_value(),
            "response": token,
        }
    ).encode("utf-8")

    # 按表单格式创建 POST 请求。
    request = Request(
        SITEVERIFY_URL,
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    # 记录耗时，便于区分「出网慢」和「token 过期/重复使用」。
    started_at = time.monotonic()
    try:
        with urlopen(request, timeout=SITEVERIFY_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read())
    except (URLError, OSError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning(
            "Turnstile siteverify failed after %.2fs: %s",
            time.monotonic() - started_at,
            exc,
        )
        raise TurnstileVerificationError(
            "暂时无法联系 Cloudflare 核验 Turnstile，请稍后重试。"
        ) from exc

    if not isinstance(result, dict):
        raise TurnstileVerificationError(
            "Cloudflare 返回了无法识别的 Turnstile 核验结果。"
        )

    if result.get("success") is not True:
        logger.info(
            "Turnstile rejected in %.2fs: error-codes=%s",
            time.monotonic() - started_at,
            result.get("error-codes"),
        )

    # 只有 Cloudflare 明确返回 success=true 才算通过。
    return result.get("success") is True


async def verify_turnstile_token(token: str) -> bool:
    """供 FastAPI 异步路由调用，避免同步网络请求阻塞事件循环。"""

    return await asyncio.to_thread(_verify_turnstile_token_sync, token)
