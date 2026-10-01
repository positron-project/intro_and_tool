import unittest
from types import SimpleNamespace

from routers.resource_submissions import can_review_submission_cohort


class ResourceSubmissionPermissionTests(unittest.TestCase):
    def test_cohort_leader_can_review_matching_cohort_only(self):
        reviewer = SimpleNamespace(role="CohortLeader", cohort="2029 届")
        same_cohort_submitter = SimpleNamespace(role="Contributor", cohort="2029")
        other_cohort_submitter = SimpleNamespace(role="Contributor", cohort="2028")

        self.assertTrue(
            can_review_submission_cohort(reviewer, same_cohort_submitter)
        )
        self.assertFalse(
            can_review_submission_cohort(reviewer, other_cohort_submitter)
        )
        self.assertFalse(can_review_submission_cohort(reviewer, None))

    def test_leader_keeps_global_review_access(self):
        leader = SimpleNamespace(role="Leader", cohort=None)

        self.assertTrue(can_review_submission_cohort(leader, None))


if __name__ == "__main__":
    unittest.main()
