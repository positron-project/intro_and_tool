import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from crud.invites import redeem_invite_code
from crud.members import sync_member_for_user
from models.invites import InviteCode
from models.members import Member
from schemas.invites import InviteCodeRedeemRequest


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self, result):
        self.result = result
        self.added = []
        self.flush = AsyncMock()
        self.commit = AsyncMock()

    async def execute(self, statement):
        return FakeResult(self.result)

    def add(self, value):
        self.added.append(value)

    async def refresh(self, value):
        return None


def make_user(**overrides):
    values = {
        "id": 42,
        "username": "student42",
        "nickname": "账号昵称",
        "avatar_url": None,
        "role": "Member",
        "status": "active",
        "cohort": "2026 届",
        "direction": "算法组",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class InviteRequestTests(unittest.TestCase):
    def test_real_name_uses_frontend_alias(self):
        request = InviteCodeRedeemRequest.model_validate(
            {"inviteCode": "OS-7K4M-9Q2P", "realName": "张三"}
        )

        self.assertEqual(request.invite_code, "OS-7K4M-9Q2P")
        self.assertEqual(request.real_name, "张三")


class MemberSyncTests(unittest.IsolatedAsyncioTestCase):
    @patch("crud.members.find_team_by_text", new_callable=AsyncMock, return_value=None)
    @patch("crud.members.find_cohort_by_text", new_callable=AsyncMock, return_value=None)
    async def test_new_member_uses_real_name_without_changing_account_nickname(
        self,
        find_cohort,
        find_team,
    ):
        user = make_user()
        db = FakeSession(None)

        member = await sync_member_for_user(db, user, real_name="  张三  ")

        self.assertIsInstance(member, Member)
        self.assertEqual(member.name, "张三")
        self.assertEqual(member.initials, "张三")
        self.assertEqual(user.nickname, "账号昵称")
        self.assertEqual(db.added, [member])
        db.flush.assert_awaited_once()
        find_cohort.assert_awaited_once()
        find_team.assert_awaited_once()

    @patch("crud.members.find_team_by_text", new_callable=AsyncMock, return_value=None)
    @patch("crud.members.find_cohort_by_text", new_callable=AsyncMock, return_value=None)
    async def test_existing_member_is_updated_with_real_name_and_initials(
        self,
        find_cohort,
        find_team,
    ):
        user = make_user()
        existing = SimpleNamespace(
            username="old-name",
            name="旧昵称",
            initials="旧昵",
            cohort_id=1,
            team_id=2,
            direction="旧方向",
            avatar_url="old-avatar",
        )
        db = FakeSession(existing)

        member = await sync_member_for_user(db, user, real_name="李四")

        self.assertIs(member, existing)
        self.assertEqual(existing.name, "李四")
        self.assertEqual(existing.initials, "李四")
        self.assertEqual(existing.username, user.username)
        self.assertEqual(user.nickname, "账号昵称")
        db.flush.assert_awaited_once()

    @patch("crud.members.find_team_by_text", new_callable=AsyncMock, return_value=None)
    @patch("crud.members.find_cohort_by_text", new_callable=AsyncMock, return_value=None)
    async def test_missing_real_name_keeps_legacy_nickname_fallback(
        self,
        find_cohort,
        find_team,
    ):
        user = make_user()
        db = FakeSession(None)

        member = await sync_member_for_user(db, user)

        self.assertEqual(member.name, "账号昵称")
        self.assertEqual(member.initials, "账号昵称"[:2])


class InviteRedeemTests(unittest.IsolatedAsyncioTestCase):
    @patch("crud.invites.record_audit_log")
    @patch("crud.invites.sync_member_for_user", new_callable=AsyncMock)
    async def test_redeem_forwards_real_name_to_member_sync(
        self,
        sync_member,
        record_audit_log,
    ):
        invite = InviteCode(
            id=7,
            code="OS-7K4M-9Q2P",
            role="Contributor",
            cohort="2026 届",
            direction="算法组",
            expires_at=datetime.now() + timedelta(days=1),
            max_uses=2,
            used_count=0,
            created_by=1,
        )
        user = make_user()
        db = FakeSession(invite)

        await redeem_invite_code(db, "os-7k4m-9q2p", user, real_name="张三")

        sync_member.assert_awaited_once_with(db=db, user=user, real_name="张三")
        self.assertEqual(user.nickname, "账号昵称")
        self.assertEqual(invite.used_count, 1)
        self.assertEqual(user.role, "Contributor")
        db.commit.assert_awaited_once()
        record_audit_log.assert_called_once()


if __name__ == "__main__":
    unittest.main()
