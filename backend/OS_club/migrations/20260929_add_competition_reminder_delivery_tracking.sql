-- 记录每个用户已经收到过的比赛提醒节点，避免用户删除通知后被定时任务重发。
ALTER TABLE competition_reminders
    ADD COLUMN notified_milestones JSON NULL;
