-- 保存用户申请加入项目的记录。
CREATE TABLE project_join_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,

    -- 用户申请加入的项目。
    project_id INT NOT NULL,

    -- 发起申请的用户。
    user_id INT NOT NULL,

    -- 用户填写的申请说明。
    message TEXT NULL,

    -- pending：待审核；approved：已通过；rejected：已拒绝。
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- 管理员审核意见。
    review_note TEXT NULL,

    -- 审核人和审核时间。
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_join_request_project
        FOREIGN KEY (project_id) REFERENCES projects(id),

    CONSTRAINT fk_join_request_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_join_request_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id),

    INDEX idx_join_request_project (project_id),
    INDEX idx_join_request_user (user_id),
    INDEX idx_join_request_status (status)
);
