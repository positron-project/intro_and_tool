"""面经公开浏览、投稿和审核接口。"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.favorites import count_favorites, get_favorite
from crud.interviews import (
    count_helpful_votes,
    cohort_digits,
    create_interview_submission,
    create_managed_interview,
    delete_interview_draft,
    delete_managed_interview,
    get_interview,
    increase_interview_views,
    list_interview_submissions_for_review,
    list_my_interview_submissions,
    list_public_interviews,
    review_interview_submission,
    submission_validation_error,
    submit_interview_submission,
    toggle_interview_helpful_vote,
    update_interview_submission,
    update_managed_interview,
    withdraw_interview_submission,
)
from models.favorites import Favorite
from models.interviews import Interview, InterviewHelpfulVote
from models.users import User
from schemas.interviews import (
    InterviewCreateRequest,
    InterviewHelpfulResponse,
    InterviewPageInfo,
    InterviewPageResponse,
    InterviewResult,
    InterviewResponse,
    InterviewReviewRequest,
    InterviewSubmissionCreateRequest,
    InterviewSubmissionUpdateRequest,
    InterviewUpdateRequest,
)
from utils.auth import get_current_user, get_optional_current_user, require_content_reviewer


router = APIRouter(prefix="/api", tags=["interviews"])

SUBMISSION_ROLES = {"Member", "Contributor", "CohortLeader", "Leader", "Admin"}


def success(data):
    """Wrap successful responses in the project's shared Result envelope."""

    return InterviewResult(data=data)


def allowed_interview_visibilities(current_user: User | None) -> set[str]:
    """匹配前端 public/members/contributors 的可见范围规则。"""

    if current_user is None or current_user.role == "Visitor":
        return {"public"}
    if current_user.role in {"Contributor", "CohortLeader", "Leader", "Admin"}:
        return {"public", "members", "contributors"}
    return {"public", "members"}


def cohort_label(value: str | None) -> str:
    value = (value or "").strip()
    if value and value.isdigit():
        return f"{value} 届"
    return value


def ensure_submission_role(user: User) -> None:
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前账号不可用")
    if user.role not in SUBMISSION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="访客账号不能投稿")


def ensure_reviewer_cohort(reviewer: User, interview: Interview) -> None:
    """届次负责人只能审核或维护自己届次的面经。"""

    if reviewer.role != "CohortLeader":
        return
    reviewer_year = cohort_digits(reviewer.cohort)
    if not reviewer_year:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前负责人还没有分配届次")
    if reviewer_year != cohort_digits(interview.cohort):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="负责人只能处理自己届次的面经")


async def build_interview_response(
    db: AsyncSession,
    interview: Interview,
    current_user: User | None = None,
    *,
    include_submitter: bool = False,
    metrics: dict | None = None,
) -> InterviewResponse:
    """聚合面经、收藏、有帮助票和审核人信息供 API 返回。"""

    interview_metrics = metrics or {}
    if metrics is None:
        helpful_count = await count_helpful_votes(db, interview.id)
        favorite_count = await count_favorites(db, "interview", str(interview.id))
        is_helpful = False
        is_favorited = False
        if current_user is not None:
            is_helpful = await db.scalar(
                select(InterviewHelpfulVote.id).where(
                    InterviewHelpfulVote.interview_id == interview.id,
                    InterviewHelpfulVote.user_id == current_user.id,
                )
            ) is not None
            is_favorited = await get_favorite(
                db, current_user.id, "interview", str(interview.id)
            ) is not None
    else:
        helpful_count = interview_metrics.get("helpful_count", 0)
        favorite_count = interview_metrics.get("favorite_count", 0)
        is_helpful = interview_metrics.get("is_helpful", False)
        is_favorited = interview_metrics.get("is_favorited", False)

    submitter_name = interview_metrics.get("submitter_name")
    if metrics is None and include_submitter and interview.submitter_id is not None:
        submitter = await db.get(User, interview.submitter_id)
        if submitter is not None:
            submitter_name = submitter.nickname or submitter.username

    history = []
    for item in interview.review_history or []:
        history.append({
            "id": item.get("id", ""),
            "action": item.get("action"),
            "status": item.get("status"),
            "reviewer_name": item.get("reviewer_name") or item.get("reviewerName") or "审核人",
            "note": item.get("note"),
            "created_at": item.get("created_at") or item.get("createdAt"),
        })

    return InterviewResponse.model_validate({
        "id": interview.id,
        "company": interview.company,
        "role": interview.role,
        "author": interview.author,
        "cohort": interview.cohort,
        "date": interview.date,
        "recruitment_type": interview.recruitment_type,
        "category": interview.category,
        "city": interview.city,
        "difficulty": interview.difficulty,
        "rounds": interview.rounds,
        "round_details": interview.round_details or [],
        "preparation": interview.preparation,
        "summary": interview.summary,
        "reflection": interview.reflection,
        "tags": interview.tags or [],
        "anonymous": interview.anonymous,
        "views": interview.views,
        "helpful_count": helpful_count,
        "is_helpful": is_helpful,
        "favorite_count": favorite_count,
        "is_favorited": is_favorited,
        "visibility": interview.visibility,
        "status": interview.status if include_submitter else None,
        "submitter_id": str(interview.submitter_id) if include_submitter and interview.submitter_id is not None else None,
        "submitter_name": submitter_name,
        "submitted_at": (interview.submitted_at or interview.created_at) if include_submitter else None,
        "withdrawn_at": interview.withdrawn_at if include_submitter else None,
        "reviewed_at": interview.reviewed_at if include_submitter else None,
        "review_note": interview.review_note if include_submitter else None,
        "review_history": history if include_submitter else [],
        "version": interview.version if include_submitter else 1,
        "created_at": interview.created_at,
        "updated_at": interview.updated_at,
        "published_at": interview.published_at if include_submitter else None,
        "created_by": interview.created_by if include_submitter else None,
        "updated_by": interview.updated_by if include_submitter else None,
    })


async def build_interview_page(
    db: AsyncSession,
    items: list[Interview],
    total: int,
    page: int,
    page_size: int,
    current_user: User | None,
    *,
    include_submitter: bool = False,
) -> InterviewPageResponse:
    interview_ids = [item.id for item in items]
    target_ids = [str(interview_id) for interview_id in interview_ids]
    metrics = {
        interview_id: {
            "favorite_count": 0,
            "is_favorited": False,
            "helpful_count": 0,
            "is_helpful": False,
            "submitter_name": None,
        }
        for interview_id in interview_ids
    }
    if interview_ids:
        favorite_counts = await db.execute(
            select(Favorite.target_id, func.count(Favorite.id))
            .where(Favorite.target_type == "interview", Favorite.target_id.in_(target_ids))
            .group_by(Favorite.target_id)
        )
        for target_id, count in favorite_counts:
            metrics[int(target_id)]["favorite_count"] = int(count)

        vote_counts = await db.execute(
            select(InterviewHelpfulVote.interview_id, func.count(InterviewHelpfulVote.id))
            .where(InterviewHelpfulVote.interview_id.in_(interview_ids))
            .group_by(InterviewHelpfulVote.interview_id)
        )
        for interview_id, count in vote_counts:
            metrics[interview_id]["helpful_count"] = int(count)

        if current_user is not None:
            favorite_ids = await db.scalars(
                select(Favorite.target_id).where(
                    Favorite.user_id == current_user.id,
                    Favorite.target_type == "interview",
                    Favorite.target_id.in_(target_ids),
                )
            )
            for target_id in favorite_ids:
                metrics[int(target_id)]["is_favorited"] = True

            helpful_ids = await db.scalars(
                select(InterviewHelpfulVote.interview_id).where(
                    InterviewHelpfulVote.user_id == current_user.id,
                    InterviewHelpfulVote.interview_id.in_(interview_ids),
                )
            )
            for interview_id in helpful_ids:
                metrics[interview_id]["is_helpful"] = True

        if include_submitter:
            submitter_ids = {item.submitter_id for item in items if item.submitter_id is not None}
            if submitter_ids:
                submitters = await db.execute(
                    select(User.id, User.username, User.nickname).where(User.id.in_(submitter_ids))
                )
                names = {
                    user_id: nickname or username
                    for user_id, username, nickname in submitters
                }
                for interview in items:
                    metrics[interview.id]["submitter_name"] = names.get(interview.submitter_id)

    return InterviewPageResponse(
        items=[
            await build_interview_response(
                db,
                item,
                current_user,
                include_submitter=include_submitter,
                metrics=metrics[item.id],
            )
            for item in items
        ],
        page=InterviewPageInfo(page=page, pageSize=page_size, total=total),
    )


@router.get("/interviews", response_model=InterviewResult[InterviewPageResponse], response_model_exclude_none=True)
async def get_interviews(
    search: str | None = None,
    recruitment_type: str | None = Query(default=None, alias="recruitmentType"),
    category: str | None = None,
    cohort: str | None = None,
    difficulty: str | None = None,
    sort: Literal["latest", "helpful", "popular"] = "latest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, alias="pageSize", ge=1, le=100),
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    items, total = await list_public_interviews(
        db,
        allowed_visibilities=allowed_interview_visibilities(current_user),
        search=search,
        recruitment_type=recruitment_type,
        category=category,
        cohort=cohort,
        difficulty=difficulty,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return success(await build_interview_page(db, items, total, page, page_size, current_user))


@router.post("/interviews", response_model=InterviewResult[InterviewResponse])
async def create_managed_interview_endpoint(
    data: InterviewCreateRequest,
    reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """兼容管理面板的直接创建；创建的内容立即作为已审核面经发布。"""

    if reviewer.role == "CohortLeader":
        reviewer_year = cohort_digits(reviewer.cohort)
        if not reviewer_year:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前负责人还没有分配届次")
        if cohort_digits(data.cohort) != reviewer_year:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="负责人只能创建自己届次的面经")
    interview = await create_managed_interview(db, data, reviewer)
    return success(await build_interview_response(db, interview, reviewer))


@router.get("/interviews/submissions/mine", response_model=InterviewResult[InterviewPageResponse])
async def get_my_interview_submissions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    submissions, total = await list_my_interview_submissions(db, current_user.id, page=page, page_size=page_size)
    page_response = await build_interview_page(
        db,
        submissions,
        total,
        page,
        page_size,
        current_user,
        include_submitter=True,
    )
    return success(page_response)


@router.post("/interviews/submissions", response_model=InterviewResult[InterviewResponse])
async def create_interview_draft(
    data: InterviewSubmissionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await create_interview_submission(
        db,
        data,
        submitter=current_user,
        cohort=cohort_label(current_user.cohort),
    )
    return success(await build_interview_response(db, interview, current_user, include_submitter=True))


@router.get("/interviews/submissions/{submission_id}", response_model=InterviewResult[InterviewResponse])
async def get_my_interview_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await get_interview(db, submission_id)
    if interview is None or interview.submitter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    return success(await build_interview_response(db, interview, current_user, include_submitter=True))


@router.patch("/interviews/submissions/{submission_id}", response_model=InterviewResult[InterviewResponse])
async def update_my_interview_submission(
    submission_id: int,
    data: InterviewSubmissionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await get_interview(db, submission_id)
    if interview is None or interview.submitter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    if interview.status not in {"draft", "changes_requested", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前状态不允许编辑")
    interview = await update_interview_submission(db, interview, data, current_user)
    return success(await build_interview_response(db, interview, current_user, include_submitter=True))


@router.post("/interviews/submissions/{submission_id}/submit", response_model=InterviewResult[InterviewResponse])
async def submit_my_interview_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await get_interview(db, submission_id)
    if interview is None or interview.submitter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    if interview.status not in {"draft", "changes_requested", "rejected"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前状态不能重新提交")
    validation_error = submission_validation_error(interview)
    if validation_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation_error)
    interview.updated_by = current_user.id
    interview = await submit_interview_submission(db, interview)
    return success(await build_interview_response(db, interview, current_user, include_submitter=True))


@router.delete("/interviews/submissions/{submission_id}", response_model=InterviewResult[None])
async def delete_my_interview_draft(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await get_interview(db, submission_id)
    if interview is None or interview.submitter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    if interview.status != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只有草稿可以删除")
    await delete_interview_draft(db, interview)
    return success(None)


@router.post("/interviews/submissions/{submission_id}/withdraw", response_model=InterviewResult[InterviewResponse])
async def withdraw_my_interview_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    ensure_submission_role(current_user)
    interview = await get_interview(db, submission_id)
    if interview is None or interview.submitter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    if interview.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只有待审核的投稿可以撤回")
    interview.updated_by = current_user.id
    interview = await withdraw_interview_submission(db, interview)
    return success(await build_interview_response(db, interview, current_user, include_submitter=True))


@router.get("/admin/interviews/submissions", response_model=InterviewResult[InterviewPageResponse])
async def get_interview_review_queue(
    cohort: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=100),
    reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    reviewer_cohort = None
    if reviewer.role == "CohortLeader":
        reviewer_cohort = cohort_digits(reviewer.cohort)
        if not reviewer_cohort:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="当前负责人还没有分配届次")
    items, total = await list_interview_submissions_for_review(
        db,
        cohort=cohort,
        search=search,
        page=page,
        page_size=page_size,
        reviewer_cohort=reviewer_cohort,
    )
    return success(await build_interview_page(
        db,
        items,
        total,
        page,
        page_size,
        reviewer,
        include_submitter=True,
    ))


@router.post("/admin/interviews/submissions/{submission_id}/review", response_model=InterviewResult[InterviewResponse])
async def review_interview_submission_endpoint(
    submission_id: int,
    data: InterviewReviewRequest,
    reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    interview = await get_interview(db, submission_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="面经投稿不存在")
    ensure_reviewer_cohort(reviewer, interview)
    if interview.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只有待审核的投稿可以处理")
    if data.action in {"reject", "request_changes"} and not (data.review_note or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="退回或要求修改时请填写审核意见")
    interview = await review_interview_submission(db, interview, data, reviewer)
    return success(await build_interview_response(db, interview, reviewer, include_submitter=True))


@router.get("/interviews/{interview_id}", response_model=InterviewResult[InterviewResponse], response_model_exclude_none=True)
async def get_interview_detail(
    interview_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    interview = await get_interview(db, interview_id)
    if interview is None or interview.status != "approved" or interview.visibility not in allowed_interview_visibilities(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="这条面经不存在或当前账号无权查看")
    return success(await build_interview_response(db, interview, current_user))


@router.post("/interviews/{interview_id}/view")
async def record_interview_view(
    interview_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    interview = await get_interview(db, interview_id)
    if interview is None or interview.status != "approved" or interview.visibility not in allowed_interview_visibilities(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="这条面经不存在或当前账号无权查看")
    views = await increase_interview_views(db, interview_id)
    if views is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="这条面经不存在或暂未公开")
    return success({"views": views})


@router.post("/interviews/{interview_id}/helpful", response_model=InterviewResult[InterviewHelpfulResponse])
async def toggle_helpful_vote(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    if current_user.role == "Visitor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="访客账号不能投票")
    interview = await get_interview(db, interview_id)
    if interview is None or interview.status != "approved" or interview.visibility not in allowed_interview_visibilities(current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="这条面经不存在或当前账号无权查看")
    count, is_helpful = await toggle_interview_helpful_vote(db, interview, current_user.id)
    return success(InterviewHelpfulResponse(helpfulCount=count, isHelpful=is_helpful))


@router.patch("/interviews/{interview_id}", response_model=InterviewResult[InterviewResponse])
async def update_managed_interview_endpoint(
    interview_id: int,
    data: InterviewUpdateRequest,
    reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    interview = await get_interview(db, interview_id)
    if interview is None or interview.status != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="已发布面经不存在")
    ensure_reviewer_cohort(reviewer, interview)
    if reviewer.role == "CohortLeader" and data.cohort is not None and cohort_digits(data.cohort) != cohort_digits(reviewer.cohort):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="负责人不能把面经移动到其他届次")
    interview = await update_managed_interview(db, interview, data, reviewer)
    return success(await build_interview_response(db, interview, reviewer))


@router.delete("/interviews/{interview_id}", response_model=InterviewResult[None])
async def delete_managed_interview_endpoint(
    interview_id: int,
    reviewer: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    interview = await get_interview(db, interview_id)
    if interview is None or interview.status != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="已发布面经不存在")
    ensure_reviewer_cohort(reviewer, interview)
    await delete_managed_interview(db, interview)
    return success(None)
