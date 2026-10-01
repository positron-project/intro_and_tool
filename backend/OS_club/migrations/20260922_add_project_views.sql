-- 为项目库增加浏览量字段。
-- 已有项目的浏览量统一从 0 开始。
ALTER TABLE projects
    ADD COLUMN views INT NOT NULL DEFAULT 0 AFTER stars;