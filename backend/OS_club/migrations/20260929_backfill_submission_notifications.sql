-- 将上线前已经存在的投稿待办和审核结果迁入统一通知收件箱。
-- 请在通知表和 dedupe_key 唯一索引已经创建后执行一次。
-- 用户删除通知后不要重跑本脚本，否则已删除的历史通知会被重新创建。

-- 现有待审核项目：组长/Admin 收到全部届次，负责人只收到自己届次。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    reviewer.id,
    'project_review_pending',
    CONCAT('项目投稿待审核：', project.name),
    project.description,
    '#/admin',
    CONCAT('project-review:', project.id, ':pending:user:', reviewer.id),
    FALSE,
    project.created_at
FROM projects AS project
JOIN users AS reviewer
  ON reviewer.status = 'active'
 AND reviewer.role IN ('CohortLeader', 'Leader', 'Admin')
WHERE project.review_status = 'pending'
  AND (project.submitted_by IS NULL OR reviewer.id <> project.submitted_by)
  AND (
      reviewer.role IN ('Leader', 'Admin')
      OR CAST(REGEXP_REPLACE(COALESCE(reviewer.cohort, ''), '[^0-9]', '') AS UNSIGNED) = project.year
  )
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;

-- 资源审核目前允许所有审核角色处理，因此给所有在职审核人回填待办。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    reviewer.id,
    'resource_submission_pending',
    CONCAT('资源投稿待审核：', submission.title),
    submission.description,
    '#/admin',
    CONCAT('resource-submission:', submission.id, ':pending:', submission.version, ':user:', reviewer.id),
    FALSE,
    submission.created_at
FROM resource_submissions AS submission
JOIN users AS reviewer
  ON reviewer.status = 'active'
 AND reviewer.role IN ('CohortLeader', 'Leader', 'Admin')
WHERE submission.status = 'pending'
  AND reviewer.id <> submission.submitter_id
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;

-- 把旧资源投稿的当前审核结果作为已读历史，不在升级时制造大量新未读。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    submission.submitter_id,
    'resource_submission_result',
    CONCAT(
        CASE submission.status
            WHEN 'approved' THEN '资源投稿已通过：'
            WHEN 'changes_requested' THEN '资源投稿需要修改：'
            ELSE '资源投稿未通过：'
        END,
        submission.title
    ),
    CONCAT(
        '你的资源投稿「', submission.title, '」审核结果：',
        CASE submission.status
            WHEN 'approved' THEN '已通过'
            WHEN 'changes_requested' THEN '需要修改'
            ELSE '未通过'
        END,
        '。',
        IF(submission.review_note IS NULL OR submission.review_note = '', '', CONCAT('审核说明：', submission.review_note))
    ),
    '#/messages',
    CONCAT('resource-submission:', submission.id, ':result:backfill'),
    TRUE,
    COALESCE(submission.reviewed_at, submission.updated_at, submission.created_at)
FROM resource_submissions AS submission
WHERE submission.status IN ('approved', 'rejected', 'changes_requested')
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;

-- 现有待审核面经：组长/Admin 收到全部，负责人按投稿届次接收。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    reviewer.id,
    'interview_submission_pending',
    CONCAT('面经投稿待审核：', interview.company, ' · ', interview.role),
    COALESCE(NULLIF(interview.summary, ''), '有一条面经投稿等待审核。'),
    '#/admin',
    CONCAT('interview-submission:', interview.id, ':pending:', interview.version, ':user:', reviewer.id),
    FALSE,
    COALESCE(interview.submitted_at, interview.created_at)
FROM interviews AS interview
JOIN users AS reviewer
  ON reviewer.status = 'active'
 AND reviewer.role IN ('CohortLeader', 'Leader', 'Admin')
WHERE interview.submitter_id IS NOT NULL
  AND interview.status = 'pending'
  AND reviewer.id <> interview.submitter_id
  AND (
      reviewer.role IN ('Leader', 'Admin')
      OR (
          reviewer.role = 'CohortLeader'
          AND REGEXP_REPLACE(COALESCE(reviewer.cohort, ''), '[^0-9]', '') <> ''
          AND REGEXP_REPLACE(COALESCE(reviewer.cohort, ''), '[^0-9]', '')
              = REGEXP_REPLACE(COALESCE(interview.cohort, ''), '[^0-9]', '')
      )
  )
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;

-- 把旧面经投稿的当前审核结果作为已读历史。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    interview.submitter_id,
    'interview_submission_result',
    CONCAT(
        CASE interview.status
            WHEN 'approved' THEN '面经投稿已通过：'
            WHEN 'changes_requested' THEN '面经投稿需要修改：'
            ELSE '面经投稿未通过：'
        END,
        interview.company, ' · ', interview.role
    ),
    CONCAT(
        '你的「', interview.company, ' · ', interview.role, '」面经投稿审核结果：',
        CASE interview.status
            WHEN 'approved' THEN '已通过'
            WHEN 'changes_requested' THEN '需要修改'
            ELSE '未通过'
        END,
        '。',
        IF(interview.review_note IS NULL OR interview.review_note = '', '', CONCAT('审核说明：', interview.review_note))
    ),
    '#/interviews/my-submissions',
    CONCAT('interview-submission:', interview.id, ':result:backfill'),
    TRUE,
    COALESCE(interview.reviewed_at, interview.updated_at, interview.created_at)
FROM interviews AS interview
WHERE interview.submitter_id IS NOT NULL
  AND interview.status IN ('approved', 'rejected', 'changes_requested')
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;

-- 反馈没有登录用户作为作者，只有组长/Admin 收到待处理提醒。
INSERT INTO notifications (
    user_id, type, title, content, link, dedupe_key, is_read, created_at
)
SELECT
    reviewer.id,
    'feedback_review_pending',
    CONCAT('留言建议待处理：', feedback.category),
    feedback.content,
    '#/admin',
    CONCAT('feedback-review:', feedback.id, ':pending:user:', reviewer.id),
    FALSE,
    feedback.created_at
FROM feedback_messages AS feedback
JOIN users AS reviewer
  ON reviewer.status = 'active'
 AND reviewer.role IN ('Leader', 'Admin')
WHERE feedback.status = 'pending'
ON DUPLICATE KEY UPDATE dedupe_key = notifications.dedupe_key;
