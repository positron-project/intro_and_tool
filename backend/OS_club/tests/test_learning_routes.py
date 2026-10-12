import unittest

from pydantic import ValidationError

from crud.learning_routes import create_learning_route, update_learning_route
from schemas.learning_routes import LearningRouteCreateRequest, LearningRouteUpdateRequest


def make_node_data():
    return {
        "id": "python-basics",
        "title": "Python 基础",
        "duration": "2 周",
        "resources": 0,
        "projects": 0,
        "description": "学习语法和基础工具",
        "projectIds": [],
        "resourceLinks": [
            {"id": "doc-python", "title": "Python 官方教程", "url": "https://docs.python.org/3/"}
        ],
        "videoLinks": [
            {"id": "video-one", "title": "第一课", "url": "https://example.com/video/1"},
            {"id": "video-two", "title": "第二课", "url": "https://example.com/video/2"},
        ],
    }


class LearningRouteLinkSchemaTests(unittest.TestCase):
    def test_create_request_keeps_multiple_links_in_json_field_format(self):
        request = LearningRouteCreateRequest.model_validate(
            {
                "title": "Python 学习路线",
                "direction": "后端",
                "nodes": [make_node_data()],
            }
        )

        saved_node = request.nodes[0].model_dump(by_alias=True)

        self.assertEqual(saved_node["resourceLinks"][0]["title"], "Python 官方教程")
        self.assertEqual(
            [link["title"] for link in saved_node["videoLinks"]],
            ["第一课", "第二课"],
        )

    def test_update_request_accepts_multiple_links(self):
        request = LearningRouteUpdateRequest.model_validate({"nodes": [make_node_data()]})

        self.assertEqual(len(request.nodes[0].resource_links), 1)
        self.assertEqual(len(request.nodes[0].video_links), 2)

    def test_rejects_non_http_links(self):
        node_data = make_node_data()
        node_data["resourceLinks"][0]["url"] = "javascript:alert(1)"

        with self.assertRaises(ValidationError):
            LearningRouteCreateRequest.model_validate(
                {"title": "测试路线", "nodes": [node_data]}
            )

    def test_keeps_legacy_single_video_fields(self):
        request = LearningRouteCreateRequest.model_validate(
            {
                "title": "旧版路线",
                "nodes": [
                    {
                        "id": "legacy-node",
                        "title": "旧版节点",
                        "videoTitle": "旧版课程",
                        "videoUrl": "https://example.com/legacy-video",
                    }
                ],
            }
        )

        node = request.nodes[0]
        self.assertEqual(node.video_title, "旧版课程")
        self.assertEqual(node.video_url, "https://example.com/legacy-video")
        self.assertIsNone(node.video_links)


class FakeAsyncSession:
    """记录 CRUD 操作，不连接真实数据库。"""

    def __init__(self):
        self.added_records = []
        self.commit_count = 0

    def add(self, record):
        self.added_records.append(record)

    async def commit(self):
        self.commit_count += 1

    async def refresh(self, record):
        return None


class LearningRouteLinkCrudTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_and_update_keep_link_lists_in_node_json(self):
        db = FakeAsyncSession()
        create_request = LearningRouteCreateRequest.model_validate(
            {
                "title": "Python 学习路线",
                "direction": "后端",
                "nodes": [make_node_data()],
            }
        )

        route = await create_learning_route(db, create_request)

        self.assertEqual(route.nodes[0]["resourceLinks"][0]["id"], "doc-python")
        self.assertEqual(len(route.nodes[0]["videoLinks"]), 2)
        self.assertEqual(db.commit_count, 1)

        update_request = LearningRouteUpdateRequest.model_validate({"nodes": [make_node_data()]})
        updated_route = await update_learning_route(db, route, update_request)

        self.assertEqual(
            updated_route.nodes[0]["resourceLinks"][0]["url"],
            "https://docs.python.org/3/",
        )
        self.assertEqual(
            [link["id"] for link in updated_route.nodes[0]["videoLinks"]],
            ["video-one", "video-two"],
        )
        self.assertEqual(db.commit_count, 2)


if __name__ == "__main__":
    unittest.main()
