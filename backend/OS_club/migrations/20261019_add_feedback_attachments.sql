-- 留言建议支持可选图片；过期后只清理图片，文字留言保留。
ALTER TABLE feedback_messages
    ADD COLUMN attachments JSON NULL,
    ADD COLUMN attachments_expires_at DATETIME NULL;

UPDATE feedback_messages
SET attachments = JSON_ARRAY()
WHERE attachments IS NULL;

ALTER TABLE feedback_messages
    MODIFY COLUMN attachments JSON NOT NULL;
