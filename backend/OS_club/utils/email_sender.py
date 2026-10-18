"""通过第三方邮件 HTTP API 发送格式化的邮箱验证码邮件。"""

import json
from html import escape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config.email_conf import get_email_settings


EMAIL_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[1]
    / "templates"
    / "email_verification.html"
)


class EmailApiError(RuntimeError):
    """邮件 API 拒绝请求、响应格式异常或暂时无法连接。"""

    def __init__(self, status_code: int | None = None):
        self.status_code = status_code
        message = (
            f"Mail API returned HTTP {status_code}"
            if status_code is not None
            else "Mail API request failed"
        )
        super().__init__(message)


def _build_email_content(code: str, purpose: str) -> tuple[str, str, str]:
    """生成邮件标题、纯文本正文和 HTML 正文。"""

    actions = {"register": "注册", "login": "登录"}
    try:
        action = actions[purpose]
    except KeyError as exc:
        raise ValueError("Unsupported email verification purpose") from exc

    text_body = (
        f"你正在进行{action}操作，验证码是：{code}。"
        "验证码将在 10 分钟后失效，请勿转发给他人。"
    )
    html_body = EMAIL_TEMPLATE_PATH.read_text(encoding="utf-8")
    html_body = html_body.replace("{{purpose}}", escape(action))
    html_body = html_body.replace("{{code}}", escape(code))

    subject = f"南昌航空大学科技小组邮箱{action}验证码"
    return subject, text_body, html_body


def send_verification_email(to_email: str, code: str, purpose: str) -> None:
    """同步提交验证码邮件；异步路由用 asyncio.to_thread 调用本函数。"""

    settings = get_email_settings()
    api_key = settings.mail_api_key.get_secret_value().strip()
    if not api_key:
        raise EmailApiError()

    subject, text_body, html_body = _build_email_content(code, purpose)
    payload = {
        "to": to_email,
        "subject": subject,
        "text": text_body,
        "html": html_body,
        "fromName": settings.mail_from_name,
        "fromEmail": settings.mail_from_email,
    }

    # HTTP API 接收 JSON；ensure_ascii=False 让中文按 UTF-8 发出。
    request = Request(
        settings.mail_api_url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            try:
                result = json.loads(response.read().decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise EmailApiError(response.status) from exc

            # 按第三方目录当前契约，只有 HTTP 200 且 status=accepted 才视为成功。
            if (
                response.status != 200
                or not isinstance(result, dict)
                or result.get("status") != "accepted"
            ):
                raise EmailApiError(response.status)
    except HTTPError as exc:
        raise EmailApiError(exc.code) from exc
    except (URLError, TimeoutError) as exc:
        raise EmailApiError() from exc
