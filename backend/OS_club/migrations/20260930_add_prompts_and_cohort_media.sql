-- Prompt 投稿、届次文案和历届合影的持久化数据表。

CREATE TABLE IF NOT EXISTS prompt_templates (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    usage_text VARCHAR(500) NOT NULL DEFAULT '',
    model VARCHAR(100) NOT NULL DEFAULT '通用模型',
    category VARCHAR(50) NOT NULL,
    preview TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    submitter_id INT NULL,
    submitted_at DATETIME NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    review_note TEXT NULL,
    created_by INT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_prompt_templates_status (status),
    INDEX idx_prompt_templates_category (category),
    INDEX idx_prompt_templates_submitter (submitter_id),
    CONSTRAINT fk_prompt_submitter FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_prompt_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_prompt_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_copy (
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    author VARCHAR(150) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cohort_photos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cohort_id INT NOT NULL,
    data_url VARCHAR(1000) NOT NULL,
    name VARCHAR(255) NOT NULL,
    caption VARCHAR(255) NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cohort_photos_cohort (cohort_id),
    CONSTRAINT fk_cohort_photos_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE
);
