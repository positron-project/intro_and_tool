import asyncio
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen


TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class TurnstileUnavailable(Exception):
    pass


def _verify_token(token: str, remote_ip: str | None) -> bool:
    secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret:
        raise TurnstileUnavailable("Turnstile secret is not configured")

    values = {"secret": secret, "response": token}
    if remote_ip:
        values["remoteip"] = remote_ip
    request = Request(
        TURNSTILE_VERIFY_URL,
        data=urlencode(values).encode("ascii"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result.get("success") is True
    except Exception as error:
        raise TurnstileUnavailable("Turnstile verification failed") from error


async def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    return await asyncio.to_thread(_verify_token, token, remote_ip)
