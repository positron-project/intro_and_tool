import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from crud.users import update_user_profile
from schemas.users import ProfileUpdateRequest


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class UserProfileSyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_profile_name_and_avatar_update_linked_member(self):
        user = SimpleNamespace(
            id=11,
            username="member11",
            nickname="旧名字",
            avatar_url=None,
        )
        member = SimpleNamespace(name="旧名字", initials="旧名", avatar_url=None)
        db = SimpleNamespace(
            execute=AsyncMock(return_value=FakeResult(member)),
            commit=AsyncMock(),
            refresh=AsyncMock(),
        )

        with patch("crud.users.delete_upload_if_unused", new=AsyncMock()):
            await update_user_profile(
                db,
                user,
                ProfileUpdateRequest(name="新名字", avatarUrl="/uploads/general/avatar.jpg"),
            )

        self.assertEqual(user.nickname, "新名字")
        self.assertEqual(user.avatar_url, "/uploads/general/avatar.jpg")
        self.assertEqual(member.name, "新名字")
        self.assertEqual(member.initials, "名字")
        self.assertEqual(member.avatar_url, "/uploads/general/avatar.jpg")
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
