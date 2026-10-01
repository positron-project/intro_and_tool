import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from routers.resources import (
    can_manage_resource,
    create_resource,
    get_user_cohort_id,
)
from schemas.resources import ResourceCreateRequest, ResourceResponse


class FakeResult:
    def __init__(self, record):
        self.record = record

    def scalar_one_or_none(self):
        return self.record


class FakeAsyncSession:
    """用假的查询结果验证权限逻辑，不连接或修改真实数据库。"""

    def __init__(self, cohort=None):
        self.cohort = cohort

    async def execute(self, statement):
        return FakeResult(self.cohort)


class ResourcePermissionTests(unittest.IsolatedAsyncioTestCase):
    async def test_cohort_leader_can_manage_resource_from_own_cohort(self):
        db = FakeAsyncSession(SimpleNamespace(id=2))
        user = SimpleNamespace(role="CohortLeader", cohort="2029")
        resource = SimpleNamespace(cohort_id=2)

        self.assertTrue(await can_manage_resource(db, user, resource))

    async def test_cohort_leader_cannot_manage_another_cohorts_resource(self):
        db = FakeAsyncSession(SimpleNamespace(id=2))
        user = SimpleNamespace(role="CohortLeader", cohort="2029")
        resource = SimpleNamespace(cohort_id=3)

        self.assertFalse(await can_manage_resource(db, user, resource))

    async def test_cohort_leader_cannot_manage_global_resource(self):
        db = FakeAsyncSession(SimpleNamespace(id=2))
        user = SimpleNamespace(role="CohortLeader", cohort="2029")
        resource = SimpleNamespace(cohort_id=None)

        self.assertFalse(await can_manage_resource(db, user, resource))

    async def test_global_leader_can_manage_resources_from_any_cohort(self):
        db = FakeAsyncSession()
        user = SimpleNamespace(role="Leader", cohort=None)
        resource = SimpleNamespace(cohort_id=3)

        self.assertTrue(await can_manage_resource(db, user, resource))

    async def test_admin_alias_keeps_global_resource_management(self):
        db = FakeAsyncSession()
        user = SimpleNamespace(role="Admin", cohort=None)
        resource = SimpleNamespace(cohort_id=None)

        self.assertTrue(await can_manage_resource(db, user, resource))

    async def test_missing_cohort_record_does_not_grant_resource_access(self):
        db = FakeAsyncSession()
        user = SimpleNamespace(role="CohortLeader", cohort="2030")
        resource = SimpleNamespace(cohort_id=2)

        self.assertIsNone(await get_user_cohort_id(db, user))
        self.assertFalse(await can_manage_resource(db, user, resource))

    async def test_cohort_leader_without_a_cohort_cannot_create_resource(self):
        db = FakeAsyncSession()
        user = SimpleNamespace(
            id=10,
            role="CohortLeader",
            cohort=None,
        )
        request = ResourceCreateRequest(
            title="测试资源",
            description="仅验证缺少届次时的权限结果",
            category="backend",
            type="article",
            author="测试用户",
        )

        with self.assertRaises(HTTPException) as error:
            await create_resource(request, user, db)

        self.assertEqual(error.exception.status_code, 400)

    async def test_resource_response_uses_string_cohort_id(self):
        resource = SimpleNamespace(
            id=8,
            title="测试资源",
            description="资源简介",
            category="backend",
            resource_type="article",
            author="测试用户",
            cohort_id=2,
        )

        response = ResourceResponse.model_validate(resource)

        self.assertEqual(response.cohort_id, "2")


if __name__ == "__main__":
    unittest.main()
