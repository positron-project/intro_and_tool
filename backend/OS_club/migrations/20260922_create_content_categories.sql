-- 保存项目库、资源库和面经墙的分类配置。
SET NAMES utf8mb4;

CREATE TABLE content_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource VARCHAR(30) NOT NULL,
    category_key VARCHAR(50) NOT NULL,
    label VARCHAR(50) NOT NULL,
    description TEXT NULL,
    accent VARCHAR(20) NOT NULL DEFAULT 'blue',
    icon VARCHAR(50) NOT NULL DEFAULT 'folder',
    sort_order INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    built_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_content_category_resource_key
        UNIQUE (resource, category_key),
    INDEX idx_content_category_resource (resource)
);

-- 与前端演示分类保持一致，首次部署后项目库可以直接显示筛选项。
INSERT INTO content_categories
    (resource, category_key, label, description, accent, icon, sort_order, enabled, built_in)
VALUES
    ('projects', 'AI', 'AI', '智能应用、Agent 与知识工程', 'blue', 'spark', 1, TRUE, TRUE),
    ('projects', 'Web', 'Web', '前端体验与全栈产品', 'violet', 'code', 2, TRUE, TRUE),
    ('projects', 'Backend', 'Backend', '服务端、数据与系统工程', 'mint', 'terminal', 3, TRUE, TRUE),
    ('projects', 'Algorithm', 'Algorithm', '算法训练、模型与实验', 'orange', 'route', 4, TRUE, TRUE),
    ('projects', 'Tools', 'Tools', '效率工具与校园服务', 'rose', 'rocket', 5, TRUE, TRUE),
    ('projects', 'other', '其他', '暂未归入现有方向的项目', 'blue', 'folder', 6, TRUE, TRUE),
    ('resources', 'frontend', '前端', '界面、交互与工程化实践', 'orange', 'code', 1, TRUE, TRUE),
    ('resources', 'backend', '后端', '服务端、数据库与接口设计', 'blue', 'terminal', 2, TRUE, TRUE),
    ('resources', 'algorithm', '算法', '算法训练与模型实践', 'violet', 'route', 3, TRUE, TRUE),
    ('resources', 'ai', 'AI', '人工智能与知识工程', 'blue', 'spark', 4, TRUE, TRUE),
    ('resources', 'agent', 'Agent', '智能体编排与应用', 'mint', 'rocket', 5, TRUE, TRUE),
    ('resources', 'database', '数据库', 'SQL、存储与数据建模', 'rose', 'folder', 6, TRUE, TRUE),
    ('resources', 'devops', 'DevOps', '部署、容器与运维工具', 'mint', 'terminal', 7, TRUE, TRUE),
    ('resources', 'prompt', 'Prompt', '提示词与模型协作方法', 'violet', 'spark', 8, TRUE, TRUE),
    ('interviews', 'intern', '实习', '暑期、日常与转正实习面试', 'blue', 'users', 1, TRUE, TRUE),
    ('interviews', 'campus', '校招', '秋招、春招与校园招聘', 'orange', 'route', 2, TRUE, TRUE),
    ('interviews', 'frontend', '前端', '前端开发与工程化岗位', 'violet', 'code', 3, TRUE, TRUE),
    ('interviews', 'backend', '后端', '服务端与系统研发岗位', 'mint', 'terminal', 4, TRUE, TRUE),
    ('interviews', 'ai', 'AI', '算法、模型与 AI 工程岗位', 'rose', 'spark', 5, TRUE, TRUE);
