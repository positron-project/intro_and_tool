"""
 @File : turnstile.py
 @Author : 加个真朋友
@Description :
"""
import asyncio
import json
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from config.turnstile_conf import get_turnstile_settings


# Cloudflare 用这个地址核验浏览器取得的 Turnstile token。
SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


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

    # 最多等待 10 秒，避免网络无响应时一直卡住。
    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read())
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise TurnstileVerificationError(
            "暂时无法联系 Cloudflare 核验 Turnstile，请稍后重试。"
        ) from exc

    if not isinstance(result, dict):
        raise TurnstileVerificationError(
            "Cloudflare 返回了无法识别的 Turnstile 核验结果。"
        )

    # 只有 Cloudflare 明确返回 success=true 才算通过。
    return result.get("success") is True


async def verify_turnstile_token(token: str) -> bool:
    """供 FastAPI 异步路由调用，避免同步网络请求阻塞事件循环。"""

    return await asyncio.to_thread(_verify_turnstile_token_sync, token)
