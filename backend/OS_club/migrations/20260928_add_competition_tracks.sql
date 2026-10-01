-- 为比赛添加赛道 JSON 字段；既有比赛先补成空数组，不删除或改写其他字段。
-- 请在每个环境中只执行一次，并在重启 API 前完成。
ALTER TABLE competitions
    ADD COLUMN tracks JSON NULL;

UPDATE competitions
SET tracks = JSON_ARRAY()
WHERE tracks IS NULL;

ALTER TABLE competitions
    MODIFY COLUMN tracks JSON NOT NULL;
