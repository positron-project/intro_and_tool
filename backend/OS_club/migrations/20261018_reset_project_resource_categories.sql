-- 项目库和资源库只保留一个默认兜底分类“其他”。
-- 面经墙分类不在本次调整范围内。

-- 先把已有内容归入“其他”，避免删除分类后出现无法筛选或无法编辑的旧数据。
UPDATE projects
SET category = 'other'
WHERE category IS NULL OR category <> 'other';

UPDATE resources
SET category = 'other'
WHERE category IS NULL OR category <> 'other';

UPDATE resource_submissions
SET category = 'other'
WHERE category IS NULL OR category <> 'other';

-- 如果“其他”不存在就补上；存在则统一成默认配置。
INSERT INTO content_categories
    (resource, category_key, label, description, accent, icon, sort_order, enabled, built_in)
SELECT 'projects', 'other', '其他', '暂未归入自定义方向的项目', 'blue', 'folder', 1, TRUE, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM content_categories
    WHERE resource = 'projects' AND category_key = 'other'
);

INSERT INTO content_categories
    (resource, category_key, label, description, accent, icon, sort_order, enabled, built_in)
SELECT 'resources', 'other', '其他', '暂未归入自定义方向的资源', 'blue', 'folder', 1, TRUE, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM content_categories
    WHERE resource = 'resources' AND category_key = 'other'
);

UPDATE content_categories
SET label = '其他',
    description = CASE resource
        WHEN 'projects' THEN '暂未归入自定义方向的项目'
        ELSE '暂未归入自定义方向的资源'
    END,
    accent = 'blue',
    icon = 'folder',
    sort_order = 1,
    enabled = TRUE,
    built_in = TRUE
WHERE resource IN ('projects', 'resources')
  AND category_key = 'other';

-- 删除项目库和资源库原有的预设分类；面经墙保持原样。
DELETE FROM content_categories
WHERE resource IN ('projects', 'resources')
  AND category_key <> 'other';
