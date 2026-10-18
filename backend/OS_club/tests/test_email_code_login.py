import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from routers.users import login, login_with_email_code
from schemas.auth import LoginCodeRequest, LoginRequest, RegistrationEmailCodeSendRequest
from schemas.users import RegisterRequest


class FakeAsyncSession:
    """只返回预设用户，不连接真实数据库。"""

    def __init__(self, user=None):
        self.user = user
        self.scalar_calls = 0

    async def scalar(self, statement):
        self.scalar_calls += 1
        return self.user


def make_user(status="active"):
    return SimpleNamespace(
        id=42,
        username="测试用户",
        email="learner@example.com",
        nickname=None,
        avatar_url=None,
        bio=None,
        role="Member",
        status=status,
        cohort=None,
        direction=None,
        created_at=datetime(2026, 10, 4),
    )


class LoginCodeSchemaTests(unittest.TestCase):
    def test_frontend_fields_are_accepted_and_remember_me_is_ignored(self):
        request = LoginCodeRequest.model_validate(
            {
                "email": "learner@example.com",
                "verificationCode": "012345",
                "turnstileToken": "test-turnstile-token",
                "rememberMe": True,
            }
        )

        self.assertEqual(request.verification_code, "012345")
        self.assertEqual(request.turnstile_token, "test-turnstile-token")

    def test_malformed_verification_code_is_rejected(self):
        with self.assertRaises(ValidationError):
            LoginCodeRequest.model_validate(
                {
                    "email": "learner@example.com",
                    "verificationCode": "12a456",
                    "turnstileToken": "test-turnstile-token",
                }
            )


class RegistrationEmailDomainTests(unittest.TestCase):
    def test_registration_accepts_supported_domains_case_insensitively(self):
        for email in ("member@gmail.com", "member@qq.com", "member@163.com", "member@GMAIL.COM"):
            with self.subTest(email=email):
                request = RegistrationEmailCodeSendRequest.model_validate(
                    {"email": email, "turnstileToken": "test-turnstile-token"}
                )
                self.assertEqual(request.email.rsplit("@", 1)[-1].lower(), email.rsplit("@", 1)[-1].lower())

    def test_registration_code_rejects_other_domains(self):
        with self.assertRaises(ValidationError):
            RegistrationEmailCodeSendRequest.model_validate(
                {"email": "member@example.com", "turnstileToken": "test-turnstile-token"}
            )

    def test_registration_request_rejects_other_domains(self):
        with self.assertRaises(ValidationError):
            RegisterRequest.model_validate(
                {
                    "username": "member",
                    "email": "member@example.com",
                    "verificationCode": "012345",
                    "password": "correct-horse-battery",
                    "turnstileToken": "test-turnstile-token",
                }
            )


class PasswordLoginSchemaTests(unittest.TestCase):
    def test_turnstile_token_is_required_and_uses_frontend_alias(self):
        request = LoginRequest.model_validate(
            {
                "email": "learner@example.com",
                "password": "correct-horse-battery",
                "turnstileToken": "test-turnstile-token",
            }
        )

        self.assertEqual(request.turnstile_token, "test-turnstile-token")

    def test_missing_turnstile_token_is_rejected(self):
        with self.assertRaises(ValidationError):
            LoginRequest.model_validate(
                {
                    "email": "learner@example.com",
                    "password": "correct-horse-battery",
                }
            )


class PasswordLoginRouteTests(unittest.IsolatedAsyncioTestCase):
    def make_request(self):
        return LoginRequest.model_validate(
            {
                "email": "learner@example.com",
                "password": "correct-horse-battery",
                "turnstileToken": "test-turnstile-token",
            }
        )

    async def test_valid_turnstile_continues_to_password_authentication(self):
        db = FakeAsyncSession()

        with (
            patch("routers.users.verify_turnstile_token", new_callable=AsyncMock, return_value=True) as verify,
            patch("routers.users.authenticate_user", new_callable=AsyncMock, return_value=make_user()) as authenticate,
            patch("routers.users.create_login_token", new_callable=AsyncMock, return_value="mock-login-token") as create_token,
        ):
            result = await login(self.make_request(), db)

        verify.assert_awaited_once_with("test-turnstile-token")
        authenticate.assert_awaited_once_with(db, "learner@example.com", "correct-horse-battery")
        create_token.assert_awaited_once_with(db, 42)
        self.assertEqual(result.access_token, "mock-login-token")

    async def test_failed_turnstile_stops_before_password_authentication(self):
        db = FakeAsyncSession()

        with (
            patch("routers.users.verify_turnstile_token", new_callable=AsyncMock, return_value=False),
            patch("routers.users.authenticate_user", new_callable=AsyncMock) as authenticate,
        ):
            with self.assertRaises(HTTPException) as error:
                await login(self.make_request(), db)

        self.assertEqual(error.exception.status_code, 400)
        authenticate.assert_not_awaited()


class LoginCodeRouteTests(unittest.IsolatedAsyncioTestCase):
    def make_request(self, email="learner@example.com", code="012345"):
        return LoginCodeRequest.model_validate(
            {
                "email": email,
                "verificationCode": code,
                "turnstileToken": "test-turnstile-token",
                "rememberMe": True,
            }
        )

    async def test_valid_code_returns_login_token_and_user(self):
        db = FakeAsyncSession(make_user())
        request = self.make_request(email="Learner@Example.com")

        with (
            patch("routers.users.verify_turnstile_token", new_callable=AsyncMock) as verify,
            patch(
                "routers.users.consume_latest_email_verification_code",
                new_callable=AsyncMock,
                return_value=True,
            ) as consume_code,
            patch(
                "routers.users.create_login_token",
                new_callable=AsyncMock,
                return_value="mock-login-token",
            ) as create_token,
        ):
            result = await login_with_email_code(request, db)

        verify.assert_awaited_once_with("test-turnstile-token")
        consume_code.assert_awaited_once_with(
            db,
            "learner@example.com",
            "012345",
            "login",
        )
        create_token.assert_awaited_once_with(db, 42)
        self.assertEqual(result.access_token, "mock-login-token")
        self.assertEqual(result.user.id, 42)

    async def test_invalid_code_returns_401_without_creating_token(self):
        db = FakeAsyncSession(make_user())
        request = self.make_request()

        with (
            patch("routers.users.verify_turnstile_token", new_callable=AsyncMock),
            patch(
                "routers.users.consume_latest_email_verification_code",
                new_callable=AsyncMock,
                return_value=False,
            ),
            patch(
                "routers.users.create_login_token",
                new_callable=AsyncMock,
            ) as create_token,
        ):
            with self.assertRaises(HTTPException) as error:
                await login_with_email_code(request, db)

        self.assertEqual(error.exception.status_code, 401)
        create_token.assert_not_awaited()

    async def test_missing_or_inactive_user_returns_401_without_checking_code(self):
        for user in (None, make_user(status="disabled"), make_user(status="closed")):
            with self.subTest(user_status=getattr(user, "status", None)):
                db = FakeAsyncSession(user)
                request = self.make_request()

                with (
                    patch("routers.users.verify_turnstile_token", new_callable=AsyncMock),
                    patch(
                        "routers.users.consume_latest_email_verification_code",
                        new_callable=AsyncMock,
                    ) as consume_code,
                    patch(
                        "routers.users.create_login_token",
                        new_callable=AsyncMock,
                    ) as create_token,
                ):
                    with self.assertRaises(HTTPException) as error:
                        await login_with_email_code(request, db)

                self.assertEqual(error.exception.status_code, 401)
                consume_code.assert_not_awaited()
                create_token.assert_not_awaited()

    async def test_failed_turnstile_stops_before_database_lookup(self):
        db = FakeAsyncSession(make_user())
        request = self.make_request()

        with (
            patch(
                "routers.users.verify_turnstile_token",
                new_callable=AsyncMock,
                return_value=False,
            ),
            patch(
                "routers.users.consume_latest_email_verification_code",
                new_callable=AsyncMock,
            ) as consume_code,
        ):
            with self.assertRaises(HTTPException) as error:
                await login_with_email_code(request, db)

        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(db.scalar_calls, 0)
        consume_code.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
