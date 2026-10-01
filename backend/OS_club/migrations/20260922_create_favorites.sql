-- 保存用户对项目、资源、面经和 Prompt 的收藏关系。
CREATE TABLE favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorite_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_favorite_user_target
        UNIQUE (user_id, target_type, target_id),
    INDEX idx_favorite_target (target_type, target_id)
);
