"""面经查询、投稿生命周期和投票的数据库操作。"""

from datetime import datetime

from sqlalchemy import String, cast, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from crud.audit_logs import record_audit_log
from crud.notifications import (
    create_notification,
    mark_notification_event_read,
    notify_content_reviewers,
)
from models.interviews import Interview, InterviewHelpfulVote
from models.users import User
from schemas.interviews import (
    InterviewCreateRequest,
    InterviewReviewRequest,
    InterviewSubmissionCreateRequest,
    InterviewSubmissionUpdateRequest,
    InterviewUpdateRequest,
)


def _clean_content_values(values: dict) -> dict:
    """统一清理用户可编辑的文本和嵌套 Pydantic 数据。"""

    cleaned = {}
    required_fields = {
        "company", "role", "author", "cohort", "date", "recruitment_type",
        "difficulty", "rounds", "summary", "anonymous", "visibility",
    }
    for name, value in values.items():
        if value is None and name in required_fields:
            continue
        if isinstance(value, str):
            value = value.strip()
            if name in {"category", "city", "preparation", "reflection"} and not value:
                value = None
        elif name == "tags":
            value = [tag.strip() for tag in (value or []) if isinstance(tag, str) and tag.strip()][:12]
        elif name == "round_details" and value is None:
            value = []
        cleaned[name] = value
    return cleaned


def cohort_digits(value: str | None) -> str:
    """把“2029 届”一类展示值规范成可比较的年份。"""

    return "".join(character for character in (value or "") if character.isdigit())


async def list_public_interviews(
    db: AsyncSession,
    *,
    allowed_visibilities: set[str],
    search: str | None,
    recruitment_type: str | None,
    category: str | None,
    cohort: str | None,
    difficulty: str | None,
    sort: str,
    page: int,
    page_size: int,
) -> tuple[list[Interview], int]:
    """只检索审核通过且当前访问者可见的面经，并执行数据库分页。"""

    statement = select(Interview).where(
        Interview.status == "approved",
        Interview.visibility.in_(allowed_visibilities),
    )

    if recruitment_type:
        statement = statement.where(Interview.recruitment_type == recruitment_type)
    if category:
        statement = statement.where(Interview.category == category)
    if cohort:
        statement = statement.where(Interview.cohort.ilike(f"%{cohort.strip()}%"))
    if difficulty:
        statement = statement.where(Interview.difficulty == difficulty)
    if search and search.strip():
        keyword = f"%{search.strip()}%"
        statement = statement.where(or_(
            Interview.company.ilike(keyword),
            Interview.role.ilike(keyword),
            Interview.author.ilike(keyword),
            Interview.cohort.ilike(keyword),
            Interview.recruitment_type.ilike(keyword),
            Interview.category.ilike(keyword),
            Interview.city.ilike(keyword),
            Interview.difficulty.ilike(keyword),
            Interview.summary.ilike(keyword),
            Interview.preparation.ilike(keyword),
            Interview.reflection.ilike(keyword),
            cast(Interview.tags, String).ilike(keyword),
            cast(Interview.round_details, String).ilike(keyword),
        ))

    total = int(await db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
    if sort == "popular":
        statement = statement.order_by(Interview.views.desc(), Interview.published_at.desc(), Interview.id.desc())
    elif sort == "helpful":
        vote_counts = (
            select(InterviewHelpfulVote.interview_id, func.count(InterviewHelpfulVote.id).label("vote_count"))
            .group_by(InterviewHelpfulVote.interview_id)
            .subquery()
        )
        statement = statement.outerjoin(vote_counts, vote_counts.c.interview_id == Interview.id).order_by(
            func.coalesce(vote_counts.c.vote_count, 0).desc(), Interview.published_at.desc(), Interview.id.desc()
        )
    else:
        statement = statement.order_by(Interview.published_at.desc(), Interview.id.desc())

    result = await db.execute(statement.offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().all()), total


async def get_interview(db: AsyncSession, interview_id: int) -> Interview | None:
    return await db.get(Interview, interview_id)


async def create_interview_submission(
    db: AsyncSession,
    data: InterviewSubmissionCreateRequest,
    *,
    submitter: User,
    cohort: str,
) -> Interview:
    values = _clean_content_values(data.model_dump(by_alias=False, mode="json"))
    interview = Interview(
        **values,
        author="匿名成员" if data.anonymous else (submitter.nickname or submitter.username),
        cohort=cohort,
        # 审核通过后面经应能被访客浏览；审核端仍可在直接创建时选择更窄的范围。
        visibility="public",
        status="draft",
        submitter_id=submitter.id,
        created_by=submitter.id,
        updated_by=submitter.id,
        version=1,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


async def list_my_interview_submissions(
    db: AsyncSession,
    submitter_id: int,
    *,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[Interview], int]:
    base = select(Interview).where(Interview.submitter_id == submitter_id)
    total = int(await db.scalar(select(func.count()).select_from(base.subquery())) or 0)
    result = await db.execute(
        base.order_by(Interview.updated_at.desc(), Interview.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def update_interview_submission(
    db: AsyncSession,
    interview: Interview,
    data: InterviewSubmissionUpdateRequest,
    submitter: User,
) -> Interview:
    values = _clean_content_values(data.model_dump(exclude_unset=True, by_alias=False, mode="json"))
    for field_name, field_value in values.items():
        setattr(interview, field_name, field_value)
    interview.author = "匿名成员" if interview.anonymous else (submitter.nickname or submitter.username)
    interview.updated_by = submitter.id
    interview.version += 1
    await db.commit()
    await db.refresh(interview)
    return interview


def submission_validation_error(interview: Interview) -> str | None:
    """提交前检查前端向导必填项，不能只依赖浏览器校验。"""

    if not interview.company.strip():
        return "请填写公司名称"
    if not interview.role.strip():
        return "请填写岗位名称"
    if not interview.recruitment_type:
        return "请选择招聘类型"
    if not interview.summary.strip():
        return "请填写面试总结"
    rounds = interview.round_details or []
    if not rounds or any(not any((question.get("question") or "").strip() for question in (round_data.get("questions") or [])) for round_data in rounds):
        return "请为每一轮至少记录一个面试问题"
    return None


async def submit_interview_submission(db: AsyncSession, interview: Interview) -> Interview:
    interview.rounds = len(interview.round_details or [])
    interview.status = "pending"
    interview.submitted_at = datetime.now()
    interview.reviewed_at = None
    interview.reviewed_by = None
    interview.review_note = None
    interview.withdrawn_at = None
    interview.published_at = None
    interview.version += 1
    await notify_content_reviewers(
        db,
        notification_type="interview_submission_pending",
        title=f"面经投稿待审核：{interview.company} · {interview.role}",
        content=interview.summary or "有一条面经投稿等待审核。",
        dedupe_prefix=f"interview-submission:{interview.id}:pending:{interview.version}",
        cohort=interview.cohort,
        exclude_user_id=interview.submitter_id,
    )
    await db.commit()
    await db.refresh(interview)
    return interview


async def delete_interview_draft(db: AsyncSession, interview: Interview) -> None:
    await db.delete(interview)
    await db.commit()


async def withdraw_interview_submission(db: AsyncSession, interview: Interview) -> Interview:
    interview.status = "withdrawn"
    interview.withdrawn_at = datetime.now()
    interview.version += 1
    # 投稿人主动撤回后，审核待办不再需要处理；历史通知仍保留在收件箱中。
    await mark_notification_event_read(
        db,
        f"interview-submission:{interview.id}:pending:",
    )
    await db.commit()
    await db.refresh(interview)
    return interview


async def list_interview_submissions_for_review(
    db: AsyncSession,
    *,
    cohort: str | None,
    search: str | None,
    page: int,
    page_size: int,
    reviewer_cohort: str | None = None,
) -> tuple[list[Interview], int]:
    statement = select(Interview).where(
        Interview.submitter_id.is_not(None),
        Interview.status == "pending",
    )
    if cohort:
        statement = statement.where(Interview.cohort.ilike(f"%{cohort.strip()}%"))
    if reviewer_cohort is not None:
        statement = statement.where(Interview.cohort.in_({
            reviewer_cohort,
            f"{reviewer_cohort} 届",
            f"{reviewer_cohort}届",
        }))
    if search and search.strip():
        keyword = f"%{search.strip()}%"
        statement = statement.outerjoin(User, User.id == Interview.submitter_id).where(or_(
            Interview.company.ilike(keyword),
            Interview.role.ilike(keyword),
            Interview.author.ilike(keyword),
            Interview.cohort.ilike(keyword),
            Interview.recruitment_type.ilike(keyword),
            Interview.category.ilike(keyword),
            Interview.city.ilike(keyword),
            Interview.difficulty.ilike(keyword),
            Interview.summary.ilike(keyword),
            cast(Interview.tags, String).ilike(keyword),
            cast(Interview.round_details, String).ilike(keyword),
            User.username.ilike(keyword),
            User.nickname.ilike(keyword),
        ))
    total = int(await db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
    statement = statement.order_by(Interview.submitted_at.desc(), Interview.id.desc())
    result = await db.execute(statement.offset((page - 1) * page_size).limit(page_size))
    return list(result.scalars().unique().all()), total


async def review_interview_submission(
    db: AsyncSession,
    interview: Interview,
    data: InterviewReviewRequest,
    reviewer: User,
) -> Interview:
    next_status = {
        "approve": "approved",
        "reject": "rejected",
        "request_changes": "changes_requested",
    }[data.action]
    note = data.review_note.strip() if data.review_note else None
    review_history = list(interview.review_history or [])
    review_history.append({
        "id": f"review-{interview.id}-{interview.version + 1}",
        "action": data.action,
        "status": next_status,
        "reviewer_name": reviewer.nickname or reviewer.username,
        "note": note,
        "created_at": datetime.now().isoformat(),
    })
    interview.status = next_status
    interview.review_note = note
    interview.reviewed_by = reviewer.id
    interview.reviewed_at = datetime.now()
    interview.updated_by = reviewer.id
    interview.review_history = review_history
    interview.published_at = interview.reviewed_at if data.action == "approve" else None
    if data.action == "approve":
        interview.visibility = "public"
    interview.version += 1

    # 审核完成后关闭审核待办，并通知投稿人审核结果。
    await mark_notification_event_read(
        db,
        f"interview-submission:{interview.id}:pending:",
    )
    result_title = {
        "approved": "已通过",
        "rejected": "未通过",
        "changes_requested": "需要修改",
    }[next_status]
    result_content = f"你的「{interview.company} · {interview.role}」面经投稿审核结果：{result_title}。"
    if note:
        result_content += f"审核说明：{note}"
    if interview.submitter_id is not None:
        await create_notification(
            db,
            user_id=interview.submitter_id,
            notification_type="interview_submission_result",
            title=f"面经投稿{result_title}：{interview.company} · {interview.role}",
            content=result_content,
            link="#/interviews/my-submissions",
            dedupe_key=f"interview-submission:{interview.id}:result:{interview.version}",
        )

    review_actions = {
        "approve": "面经投稿审核通过",
        "reject": "面经投稿未通过",
        "request_changes": "要求修改面经投稿",
    }
    record_audit_log(
        db,
        actor_id=reviewer.id,
        actor_name=reviewer.nickname or reviewer.username,
        action=review_actions[data.action],
        resource_type="interview_submission",
        resource_id=str(interview.id),
        target=f"{interview.company} · {interview.role}",
    )

    await db.commit()
    await db.refresh(interview)
    return interview


async def create_managed_interview(db: AsyncSession, data: InterviewCreateRequest, user: User) -> Interview:
    values = _clean_content_values(data.model_dump(by_alias=False, mode="json"))
    if values.get("round_details"):
        values["rounds"] = len(values["round_details"])
    interview = Interview(
        **values,
        status="approved",
        published_at=datetime.now(),
        created_by=user.id,
        updated_by=user.id,
        version=1,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


async def update_managed_interview(
    db: AsyncSession,
    interview: Interview,
    data: InterviewUpdateRequest,
    user: User,
) -> Interview:
    values = _clean_content_values(data.model_dump(exclude_unset=True, by_alias=False, mode="json"))
    for field_name, field_value in values.items():
        setattr(interview, field_name, field_value)
    if values.get("round_details"):
        interview.rounds = len(values["round_details"])
    interview.updated_by = user.id
    interview.version += 1
    await db.commit()
    await db.refresh(interview)
    return interview


async def delete_managed_interview(db: AsyncSession, interview: Interview) -> None:
    # Clean polymorphic favorites explicitly; helpful votes cascade through their FK.
    from models.favorites import Favorite

    await db.execute(
        delete(Favorite).where(
            Favorite.target_type == "interview",
            Favorite.target_id == str(interview.id),
        )
    )
    await db.delete(interview)
    await db.commit()


async def increase_interview_views(db: AsyncSession, interview_id: int) -> int | None:
    result = await db.execute(
        update(Interview)
        .where(Interview.id == interview_id, Interview.status == "approved")
        .values(views=Interview.views + 1)
    )
    if not result.rowcount:
        await db.rollback()
        return None
    await db.commit()
    interview = await db.get(Interview, interview_id)
    if interview is None:
        return None
    await db.refresh(interview, attribute_names=["views"])
    return interview.views


async def toggle_interview_helpful_vote(
    db: AsyncSession,
    interview: Interview,
    user_id: int,
) -> tuple[int, bool]:
    """锁住面经行后切换当前用户的一票，防止并发重复插入。"""

    await db.execute(select(Interview.id).where(Interview.id == interview.id).with_for_update())
    result = await db.execute(
        select(InterviewHelpfulVote).where(
            InterviewHelpfulVote.interview_id == interview.id,
            InterviewHelpfulVote.user_id == user_id,
        )
    )
    vote = result.scalar_one_or_none()
    if vote is None:
        db.add(InterviewHelpfulVote(interview_id=interview.id, user_id=user_id))
        is_helpful = True
    else:
        await db.delete(vote)
        is_helpful = False
    await db.flush()
    count = int(await db.scalar(
        select(func.count(InterviewHelpfulVote.id)).where(InterviewHelpfulVote.interview_id == interview.id)
    ) or 0)
    await db.commit()
    return count, is_helpful


async def count_helpful_votes(db: AsyncSession, interview_id: int) -> int:
    return int(await db.scalar(
        select(func.count(InterviewHelpfulVote.id)).where(InterviewHelpfulVote.interview_id == interview_id)
    ) or 0)
