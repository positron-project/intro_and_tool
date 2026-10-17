import unittest

from schemas.resource_submissions import (
    ResourceSubmissionCreateRequest,
    ResourceSubmissionResponse,
)
from schemas.resources import (
    ResourceCreateRequest,
    ResourceLink,
    ResourceResponse,
    ResourceUpdateRequest,
)


class ResourceLinkSchemaTests(unittest.TestCase):
    def test_resource_create_accepts_multiple_labeled_links(self):
        request = ResourceCreateRequest.model_validate(
            {
                "title": "学习资料",
                "description": "相关链接",
                "category": "AI",
                "type": "article",
                "author": "小王",
                "links": [
                    {
                        "title": "课程视频",
                        "url": "https://example.com/video",
                        "description": "课程讲解",
                    },
                    {
                        "title": "配套文档",
                        "url": "https://example.com/docs",
                    },
                ],
            }
        )

        self.assertEqual(len(request.links), 2)
        self.assertEqual(request.links[0].title, "课程视频")
        self.assertEqual(request.model_dump()["links"][1]["url"], "https://example.com/docs")

    def test_resource_update_can_clear_links_without_changing_omitted_links(self):
        clear_links = ResourceUpdateRequest.model_validate({"links": []})
        unchanged_links = ResourceUpdateRequest.model_validate({"title": "新标题"})

        self.assertEqual(
            clear_links.model_dump(exclude_unset=True),
            {"links": []},
        )
        self.assertNotIn("links", unchanged_links.model_dump(exclude_unset=True))

        with self.assertRaises(ValueError):
            ResourceUpdateRequest.model_validate({"links": None})

    def test_link_title_and_url_are_required(self):
        with self.assertRaises(ValueError):
            ResourceLink.model_validate({"title": "课程视频"})

    def test_resource_link_trims_text_and_only_accepts_http_urls(self):
        link = ResourceLink.model_validate(
            {
                "title": "  网盘资料  ",
                "url": " https://example.com/share ",
                "description": "  提取码 abcd  ",
            }
        )

        self.assertEqual(link.title, "网盘资料")
        self.assertEqual(link.url, "https://example.com/share")
        self.assertEqual(link.description, "提取码 abcd")

        with self.assertRaises(ValueError):
            ResourceLink.model_validate(
                {"title": "不安全链接", "url": "javascript:alert(1)"}
            )

    def test_resource_and_submission_responses_include_links(self):
        resource = ResourceResponse.model_validate(
            {
                "id": 1,
                "title": "学习资料",
                "description": "相关链接",
                "category": "AI",
                "resource_type": "article",
                "author": "小王",
                "links": [{"title": "课程视频", "url": "https://example.com/video"}],
            }
        )
        submission = ResourceSubmissionCreateRequest.model_validate(
            {
                "title": "学习资料",
                "description": "相关链接",
                "category": "AI",
                "resourceType": "article",
                "links": [{"title": "课程视频", "url": "https://example.com/video"}],
            }
        )
        response = ResourceSubmissionResponse.model_validate(
            {
                "id": 1,
                "submitterId": 2,
                "title": submission.title,
                "description": submission.description,
                "category": submission.category,
                "resourceType": submission.resource_type,
                "accessMode": submission.access_mode,
                "visibility": submission.visibility,
                "links": [link.model_dump() for link in submission.links],
                "submittedAt": "2026-10-17T00:00:00",
                "updatedAt": "2026-10-17T00:00:00",
            }
        )

        self.assertEqual(resource.links[0].title, "课程视频")
        self.assertEqual(response.links[0].url, "https://example.com/video")


if __name__ == "__main__":
    unittest.main()
