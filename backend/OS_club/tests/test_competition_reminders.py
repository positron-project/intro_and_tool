import unittest
from datetime import datetime
from types import SimpleNamespace

from crud.competitions import update_competition
from schemas.competitions import CompetitionUpdateRequest
from tasks.competition_reminders import milestone_marker, notification_dedupe_key


class CompetitionReminderKeyTests(unittest.TestCase):
    def test_changed_schedule_time_creates_a_distinct_reminder(self):
        old_time = datetime(2026, 11, 1, 9, 0)
        new_time = datetime(2026, 11, 8, 9, 0)

        self.assertNotEqual(
            milestone_marker("event_start", old_time),
            milestone_marker("event_start", new_time),
        )
        self.assertNotEqual(
            notification_dedupe_key(7, "event_start", old_time, 12),
            notification_dedupe_key(7, "event_start", new_time, 12),
        )

    def test_same_schedule_time_keeps_a_stable_reminder_key(self):
        event_time = datetime(2026, 11, 1, 9, 0)

        self.assertEqual(
            notification_dedupe_key(7, "event_start", event_time, 12),
            notification_dedupe_key(7, "event_start", event_time, 12),
        )


class CompetitionReminderResetTests(unittest.IsolatedAsyncioTestCase):
    async def test_changing_one_date_clears_only_that_nodes_markers(self):
        reminder = SimpleNamespace(
            notified_milestones=[
                "event_start",
                "event_start:2026-11-01 09:00",
                "registration_end:2026-10-20 23:59",
            ]
        )

        class Result:
            def scalars(self):
                return self

            def all(self):
                return [reminder]

        class Database:
            async def execute(self, _statement):
                return Result()

            async def commit(self):
                pass

            async def refresh(self, _item):
                pass

        competition = SimpleNamespace(
            id=7,
            event_start="2026-11-01T09:00",
            date="2026-11-01T09:00",
            registration_start=None,
            registration_end=None,
            deadline="",
            event_end=None,
            result_date=None,
            tracks=[],
        )

        await update_competition(
            Database(),
            competition,
            CompetitionUpdateRequest(eventStart="2026-11-08T09:00"),
            updater_id=12,
        )

        self.assertEqual(
            reminder.notified_milestones,
            ["registration_end:2026-10-20 23:59"],
        )


if __name__ == "__main__":
    unittest.main()
