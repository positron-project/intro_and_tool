-- 给早期已创建的 competitions 表补充当前比赛中心需要的时间节点和生命周期字段。
-- 旧比赛默认视为已发布，避免升级后现有比赛从公开列表消失。
ALTER TABLE competitions
    ADD COLUMN series_name VARCHAR(150) NULL,
    ADD COLUMN organizer VARCHAR(150) NULL,
    ADD COLUMN official_url VARCHAR(500) NULL,
    ADD COLUMN registration_start VARCHAR(100) NULL,
    ADD COLUMN registration_end VARCHAR(100) NULL,
    ADD COLUMN event_start VARCHAR(100) NULL,
    ADD COLUMN event_end VARCHAR(100) NULL,
    ADD COLUMN result_date VARCHAR(100) NULL,
    ADD COLUMN lifecycle VARCHAR(20) NOT NULL DEFAULT 'published',
    ADD COLUMN created_by INT NULL,
    ADD COLUMN updated_by INT NULL,
    ADD COLUMN published_at DATETIME NULL,
    ADD COLUMN archived_at DATETIME NULL,
    ADD INDEX ix_competitions_lifecycle (lifecycle),
    ADD CONSTRAINT fk_competition_creator
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_competition_updater
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- competition_projects 和 competition_reminders 由 init_db.py 根据 ORM 模型创建。
-- create_all 只会补建缺失的表，不会删除已有表或已有数据。
