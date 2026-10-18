-- 资源库和资源投稿支持多条带说明的外部链接。
-- 执行后，旧版 resource_url 会被转换成一条名为“外部资源”的链接，避免旧数据丢失。
-- 部署前先备份数据库；这是一次性迁移脚本，只能对每个数据库执行一次。

ALTER TABLE resources
    ADD COLUMN links JSON NULL AFTER resource_url;

UPDATE resources
SET links = CASE
    WHEN resource_url IS NOT NULL AND TRIM(resource_url) <> '' THEN
        JSON_ARRAY(JSON_OBJECT(
            'title', '外部资源',
            'url', resource_url,
            'description', NULL
        ))
    ELSE JSON_ARRAY()
END
WHERE links IS NULL;

ALTER TABLE resources
    MODIFY COLUMN links JSON NOT NULL;

ALTER TABLE resource_submissions
    ADD COLUMN links JSON NULL AFTER resource_url;

UPDATE resource_submissions
SET links = CASE
    WHEN resource_url IS NOT NULL AND TRIM(resource_url) <> '' THEN
        JSON_ARRAY(JSON_OBJECT(
            'title', '外部资源',
            'url', resource_url,
            'description', NULL
        ))
    ELSE JSON_ARRAY()
END
WHERE links IS NULL;

ALTER TABLE resource_submissions
    MODIFY COLUMN links JSON NOT NULL;
