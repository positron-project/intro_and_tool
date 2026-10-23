-- 不回填历史归属：未登记的文件仅允许组长或管理员清理。
CREATE TABLE IF NOT EXISTS upload_assets (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    owner_id INT NULL,
    INDEX ix_upload_assets_owner_id (owner_id),
    CONSTRAINT fk_upload_assets_owner FOREIGN KEY (owner_id)
        REFERENCES users(id) ON DELETE SET NULL
);
