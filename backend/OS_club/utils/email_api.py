import asyncio
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_EMAIL_API_URL = "https://mail-api.twoword.cfd/api/v1/emails"


class EmailApiError(Exception):
    def __init__(self, status_code: int | None = None):
        self.status_code = status_code


def _post_email(payload: dict) -> dict:
    url = os.getenv("MAIL_API_URL", DEFAULT_EMAIL_API_URL)
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            if (
                response.status != 200
                or not isinstance(result, dict)
                or result.get("status") != "accepted"
            ):
                raise EmailApiError(response.status)
            return result
    except HTTPError as error:
        raise EmailApiError(error.code) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise EmailApiError() from error


async def send_verification_email(email: str, code: str, purpose: str) -> dict:
    action = "注册" if purpose == "register" else "登录"
    text = f"你正在进行{action}操作，验证码是：{code}。验证码将在 10 分钟后失效，请勿转发给他人。"
    html = f"""
                <!DOCTYPE html>
                <html lang="zh-CN">
                <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,'Microsoft YaHei',sans-serif;color:#1f2937;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <div style="padding:24px 32px;background:#1d4ed8;color:#ffffff;">
                      <div style="font-size:20px;font-weight:700;">南昌航空大学科技学院计算机科技小组</div>
                      <div style="margin-top:6px;font-size:14px;opacity:.9;">账号安全验证</div>
                    </div>
                    <div style="padding:30px 32px;">
                      <p style="margin:0 0 16px;font-size:16px;">你正在进行{action}操作，请使用以下验证码：</p>
                      <div style="margin:20px 0;padding:18px;background:#eff6ff;border-radius:8px;text-align:center;color:#1d4ed8;font-size:32px;font-weight:700;letter-spacing:8px;">{code}</div>
                      <p style="margin:16px 0 0;font-size:14px;color:#b45309;">验证码将在 10 分钟后失效，请尽快完成验证。</p>
                      <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">如果这不是你本人操作，请忽略此邮件。请勿将验证码透露给任何人。</p>
                    </div>
                  </div>
                </body>
                </html>
                """
    payload = {
        "to": email,
        "subject": f"南昌航空大学科技小组邮箱{action}验证码",
        "text": text,
        "html": html,
        "fromName": "南航计算机科技小组",
        "fromEmail": "nanhang@twoword.cfd",
    }
    return await asyncio.to_thread(_post_email, payload)
