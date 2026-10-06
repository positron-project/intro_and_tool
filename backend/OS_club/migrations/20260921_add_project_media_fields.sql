-- 为项目库新增下载地址和展示图片列表。
-- 只增加可为空/有默认值的字段，不修改或删除已有项目数据。
ALTER TABLE projects
    ADD COLUMN download_url VARCHAR(500) NULL AFTER issue_url,
    ADD COLUMN gallery_images JSON NULL AFTER cover_image;

-- 已有项目没有展示图，使用空数组作为默认值。
UPDATE projects
SET gallery_images = JSON_ARRAY()
WHERE gallery_images IS NULL;

ALTER TABLE projects
    MODIFY COLUMN gallery_images JSON NOT NULL;
