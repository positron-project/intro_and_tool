-- 留言建议业务记录；通知和留言内容分别保存，删除通知不会影响留言记录。
CREATE TABLE IF NOT EXISTS feedback_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    contact VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    review_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_feedback_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
