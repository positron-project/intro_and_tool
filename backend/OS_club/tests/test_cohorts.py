import unittest
from datetime import datetime

from fastapi import HTTPException

from crud.cohorts import delete_cohort
from models.members import Member
from models.cohorts import Cohort, CohortTeam
from models.users import User
from routers.cohorts import create_cohort as create_cohort_endpoint
from routers.cohorts import delete_cohort as delete_cohort_endpoint
from schemas.cohorts import CohortCreateRequest


class FakeResult:
    def __init__(self, records):
        self.records = records

    def scalars(self):
        return self

    def all(self):
        return self.records

    def scalar_one_or_none(self):
        return self.records[0] if self.records else None


class FakeAsyncSession:
    """用简单对象代替数据库，避免测试改动真实数据。"""

    def __init__(self):
        self.added_records = []
        self.flush_count = 0
        self.commit_count = 0
        self.events = []

    async def execute(self, statement):
        column_description = statement.column_descriptions[0]
        model = column_description["entity"]
        records = [
            record
            for record in self.added_records
            if isinstance(record, model)
        ]
        if model is User and column_description["name"] == "cohort":
            records = [record.cohort for record in records]
        return FakeResult(records)

    def add(self, record):
        self.added_records.append(record)

    async def flush(self):
        self.flush_count += 1
        self.events.append("flush")
        for record in self.added_records:
            if isinstance(record, Cohort) and record.id is None:
                record.id = 100

    async def delete(self, record):
        self.events.append(("delete", type(record).__name__, record.id))

    async def commit(self):
        self.commit_count += 1
        self.events.append("commit")
        current_time = datetime.now()
        next_team_id = 200
        for record in self.added_records:
            if isinstance(record, (Cohort, CohortTeam)):
                if isinstance(record, CohortTeam) and record.id is None:
                    record.id = next_team_id
                    next_team_id += 1
                record.created_at = current_time
                record.updated_at = current_time

    async def refresh(self, record):
        return None


class CreateCohortTests(unittest.IsolatedAsyncioTestCase):
    async def test_new_cohort_gets_three_default_teams_in_one_commit(self):
        db = FakeAsyncSession()
        request = CohortCreateRequest(
            year="2030",
            generationLabel="第五代",
            description="测试届次",
        )

        response = await create_cohort_endpoint(
            cohort_data=request,
            current_admin=None,
            db=db,
        )

        self.assertEqual(response.id, 100)
        self.assertEqual(
            {team.name for team in response.teams},
            {"算法组", "项目组", "网安组"},
        )
        self.assertEqual(len(response.teams), 3)
        self.assertTrue(
            all(team.cohort_id == response.id for team in db.added_records if isinstance(team, CohortTeam))
        )
        self.assertTrue(
            all(team.member_capacity is None for team in response.teams)
        )
        self.assertEqual(db.flush_count, 1)
        self.assertEqual(db.commit_count, 1)


class DeleteCohortTests(unittest.IsolatedAsyncioTestCase):
    async def test_refuses_to_delete_cohort_that_has_member_profile(self):
        db = FakeAsyncSession()
        cohort = Cohort(id=3, year="2028", generation_label="第三届")
        member = Member(id=7, name="测试成员", cohort_id=3)
        db.added_records.extend([cohort, member])

        with self.assertRaises(HTTPException) as error:
            await delete_cohort_endpoint(
                cohort_id=3,
                current_admin=None,
                db=db,
            )

        self.assertEqual(error.exception.status_code, 409)
        self.assertIn("成员档案", error.exception.detail)
        self.assertEqual(db.events, [])

    async def test_refuses_to_delete_cohort_that_has_assigned_user(self):
        db = FakeAsyncSession()
        cohort = Cohort(id=3, year="2028", generation_label="第三届")
        user = User(
            id=8,
            username="test-member",
            email="test-member@example.com",
            password_hash="not-a-real-password-hash",
            cohort="2028 届",
        )
        db.added_records.extend([cohort, user])

        with self.assertRaises(HTTPException) as error:
            await delete_cohort_endpoint(
                cohort_id=3,
                current_admin=None,
                db=db,
            )

        self.assertEqual(error.exception.status_code, 409)
        self.assertIn("成员账号", error.exception.detail)
        self.assertEqual(db.events, [])

    async def test_deletes_teams_before_cohort(self):
        db = FakeAsyncSession()
        cohort = Cohort(id=3, year="2028", generation_label="第三届")
        teams = [
            CohortTeam(id=31, cohort_id=3, name="算法组"),
            CohortTeam(id=32, cohort_id=3, name="项目组"),
        ]
        db.added_records.extend([cohort, *teams])

        deleted = await delete_cohort(db, cohort_id=3)

        self.assertTrue(deleted)
        self.assertEqual(
            db.events,
            [
                ("delete", "CohortTeam", 31),
                ("delete", "CohortTeam", 32),
                "flush",
                ("delete", "Cohort", 3),
                "commit",
            ],
        )


if __name__ == "__main__":
    unittest.main()
