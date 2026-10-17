import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from crud.project_join_requests import create_join_request, review_join_request
from crud.project_members import normalize_project_member_ids


class FakeScalars:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class FakeResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return FakeScalars(self.values)


class FakeAsyncSession:
    def __init__(self, results):
        self.results = list(results)
        self.get = AsyncMock()
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    async def execute(self, _statement):
        return self.results.pop(0)


class ProjectMemberTests(unittest.IsolatedAsyncioTestCase):
    async def test_normalize_deduplicates_account_and_linked_profile_ids(self):
        db = FakeAsyncSession([
            FakeResult([12]),
            FakeResult([
                SimpleNamespace(id=33, user_id=12),
                SimpleNamespace(id=34, user_id=None),
            ]),
        ])

        member_ids = await normalize_project_member_ids(
            db,
            ["12", "member:33", "34", "member:34", "999", " 12 "],
        )

        self.assertEqual(member_ids, ["12", "member:34", "999"])

    async def test_legacy_numeric_collision_prefers_account_id(self):
        db = FakeAsyncSession([
            FakeResult([33]),
            FakeResult([SimpleNamespace(id=33, user_id=12)]),
        ])

        member_ids = await normalize_project_member_ids(db, ["33", "member:33"])

        self.assertEqual(member_ids, ["33", "12"])

    async def test_join_request_rejects_account_already_listed_by_profile_id(self):
        db = FakeAsyncSession([
            FakeResult([SimpleNamespace(id=33, user_id=12)]),
        ])
        project = SimpleNamespace(
            id=4,
            review_status="approved",
            join_enabled=True,
            member_ids=["member:33"],
        )

        with self.assertRaisesRegex(ValueError, "已经是这个项目的成员"):
            await create_join_request(
                db=db,
                project=project,
                user=SimpleNamespace(id=12),
                data=SimpleNamespace(message=None),
            )

    async def test_approving_join_request_deduplicates_member_count(self):
        db = FakeAsyncSession([
            FakeResult([12]),
            FakeResult([SimpleNamespace(id=33, user_id=12)]),
        ])
        db.get.return_value = SimpleNamespace(
            id=4,
            name="测试项目",
            submitted_by=99,
            member_ids=["12", "member:33"],
            member_count=2,
        )
        request = SimpleNamespace(
            id=7,
            status="pending",
            project_id=4,
            user_id=12,
            review_note=None,
            reviewed_by=None,
            reviewed_at=None,
        )

        with (
            patch(
                "crud.project_join_requests.get_join_request_by_id",
                new=AsyncMock(return_value=request),
            ),
            patch(
                "crud.project_join_requests.get_notification_by_dedupe_key",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "crud.project_join_requests.create_notification",
                new=AsyncMock(),
            ),
        ):
            await review_join_request(
                db=db,
                request_id=7,
                reviewer_id=99,
                data=SimpleNamespace(status="approved", review_note=None),
            )

        project = db.get.return_value
        self.assertEqual(project.member_ids, ["12"])
        self.assertEqual(project.member_count, 1)
        db.commit.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
