import io
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from starlette.requests import Request

from models.upload_assets import UploadAsset
from routers.uploads import delete_unused_upload, upload_asset


class UploadPermissionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / ("a" * 32 + ".png")
        self.path.write_bytes(b"image")
        self.user = SimpleNamespace(id=1, role="Member")
        self.asset = UploadAsset(id=self.path.name, owner_id=1)
        self.db = SimpleNamespace(
            get=AsyncMock(return_value=self.asset), add=Mock(),
            commit=AsyncMock(), rollback=AsyncMock(), delete=AsyncMock(),
        )
        self.find = patch("routers.uploads.find_upload_path", return_value=self.path)
        self.find.start()
        self.addCleanup(self.find.stop)
        self.references = AsyncMock(return_value=False)
        checker = patch("routers.uploads.is_upload_referenced", self.references)
        checker.start()
        self.addCleanup(checker.stop)

    async def delete(self):
        return await delete_unused_upload(self.path.name, self.user, self.db)

    async def test_owner_can_delete_unused_file_and_record(self):
        self.assertEqual((await self.delete()).status_code, 204)
        self.assertFalse(self.path.exists())
        self.db.delete.assert_awaited_once_with(self.asset)
        self.db.commit.assert_awaited_once()

    async def test_other_members_and_cohort_leaders_cannot_delete(self):
        for role in ("Member", "Contributor", "CohortLeader"):
            with self.subTest(role=role):
                self.user = SimpleNamespace(id=2, role=role)
                with self.assertRaises(HTTPException) as error:
                    await self.delete()
                self.assertEqual(error.exception.status_code, 403)
                self.assertTrue(self.path.exists())
        self.references.assert_not_awaited()
        self.db.delete.assert_not_awaited()

    async def test_global_admin_can_delete_another_users_unused_file(self):
        for role in ("Leader", "Admin"):
            with self.subTest(role=role):
                self.path.write_bytes(b"image")
                self.user = SimpleNamespace(id=2, role=role)
                self.assertEqual((await self.delete()).status_code, 204)

    async def test_legacy_or_unowned_files_require_global_admin(self):
        for asset in (None, UploadAsset(id=self.path.name, owner_id=None)):
            self.db.get.return_value = asset
            with self.assertRaises(HTTPException) as error:
                await self.delete()
            self.assertEqual(error.exception.status_code, 403)
            self.assertTrue(self.path.exists())
        self.user.role = "Leader"
        self.db.get.return_value = None
        self.assertEqual((await self.delete()).status_code, 204)

    async def test_referenced_files_are_protected_even_from_admin(self):
        self.references.return_value = True
        for role in ("Member", "Leader", "Admin"):
            self.user.role = role
            with self.assertRaises(HTTPException) as error:
                await self.delete()
            self.assertEqual(error.exception.status_code, 409)
            self.assertTrue(self.path.exists())
        self.db.delete.assert_not_awaited()

    async def test_upload_records_authenticated_owner(self):
        request = Request({"type": "http", "scheme": "http", "server": ("localhost", 8000), "path": "/api/uploads", "headers": []})
        file = UploadFile(io.BytesIO(b"image"), filename="test.png", headers=Headers({"content-type": "image/png"}))
        with patch("routers.uploads.UPLOAD_ROOT", Path(self.temp.name)):
            result = await upload_asset(request, file, None, None, self.user, self.db)
        record = self.db.add.call_args.args[0]
        self.assertEqual(record.owner_id, self.user.id)
        self.assertEqual(record.id, result["id"])
        self.assertTrue((Path(self.temp.name) / "general" / result["id"]).exists())

    async def test_failed_registration_does_not_leave_unowned_upload(self):
        request = Request({"type": "http", "scheme": "http", "server": ("localhost", 8000), "path": "/api/uploads", "headers": []})
        file = UploadFile(io.BytesIO(b"image"), filename="test.png", headers=Headers({"content-type": "image/png"}))
        self.db.commit.side_effect = RuntimeError("database unavailable")
        with patch("routers.uploads.UPLOAD_ROOT", Path(self.temp.name)):
            with self.assertRaises(RuntimeError):
                await upload_asset(request, file, None, None, self.user, self.db)
        self.db.rollback.assert_awaited_once()
        self.assertEqual(list((Path(self.temp.name) / "general").iterdir()), [])
