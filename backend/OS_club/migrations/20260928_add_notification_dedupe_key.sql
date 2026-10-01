-- 定时任务重复运行时，用稳定的业务键避免重复创建同一条通知。
ALTER TABLE notifications
    ADD COLUMN dedupe_key VARCHAR(255) NULL,
    ADD CONSTRAINT uq_notification_dedupe_key UNIQUE (dedupe_key);
