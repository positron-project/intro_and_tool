-- 将上线前已有的项目加入申请补进统一通知表。
-- 这是一次性数据回填脚本。dedupe_key 唯一约束用于避免重复生成业务事件；
-- 如果用户之后删除了通知，不要再次运行本脚本，否则会重新创建被删通知。
-- 待处理申请保持未读；已处理申请及其结果作为已读历史保留。

INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    link,
    dedupe_key,
    is_read,
    created_at
)
SELECT
    project.submitted_by,
    'project_join_request',
    CONCAT(COALESCE(NULLIF(applicant.nickname, ''), applicant.username), '申请加入「', project.name, '」'),
    COALESCE(NULLIF(join_request.message, ''), '未填写申请说明'),
    NULL,
    CONCAT('project-join-request:', join_request.id, ':submitted'),
    join_request.status <> 'pending',
    join_request.created_at
FROM project_join_requests AS join_request
JOIN projects AS project ON project.id = join_request.project_id
JOIN users AS applicant ON applicant.id = join_request.user_id
WHERE project.submitted_by IS NOT NULL
  AND project.submitted_by <> join_request.user_id
ON DUPLICATE KEY UPDATE dedupe_key = VALUES(dedupe_key);

INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    link,
    dedupe_key,
    is_read,
    created_at
)
SELECT
    join_request.user_id,
    'project_join_request_result',
    IF(join_request.status = 'approved', '项目加入申请已通过', '项目加入申请未通过'),
    CONCAT(
        '你申请加入「',
        project.name,
        '」的请求',
        IF(join_request.status = 'approved', '已通过。', '未通过。'),
        IF(
            join_request.review_note IS NULL OR join_request.review_note = '',
            '',
            CONCAT('审核说明：', join_request.review_note)
        )
    ),
    NULL,
    CONCAT('project-join-request:', join_request.id, ':result'),
    TRUE,
    COALESCE(join_request.reviewed_at, join_request.updated_at)
FROM project_join_requests AS join_request
JOIN projects AS project ON project.id = join_request.project_id
WHERE join_request.status IN ('approved', 'rejected')
ON DUPLICATE KEY UPDATE dedupe_key = VALUES(dedupe_key);
