"""Prompt 模板公开浏览、成员投稿和管理员审核接口。"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.favorites import count_favorites, get_favorite
from crud.notifications import create_notification, notify_content_reviewers
from crud.prompts import create_prompt, get_prompt, list_prompts, update_prompt, update_prompt_review
from models.favorites import Favorite
from models.prompts import PromptTemplate
from models.users import User
from schemas.prompts import (
    PromptCreateRequest,
    PromptResponse,
    PromptReviewRequest,
    PromptReviewResponse,
    PromptSubmissionRequest,
    PromptUpdateRequest,
)
from utils.auth import get_current_user, get_optional_current_user, require_leader_or_admin


router = APIRouter(prefix="/api/prompts", tags=["Content"])


async def build_prompt_response(
    db: AsyncSession,
    prompt: PromptTemplate,
    current_user: User | None = None,
    *,
    include_submitter: bool = False,
):
    """把数据库编号、收藏数和投稿人资料整理成前端字段。"""

    favorite_count = await count_favorites(db, "prompt", str(prompt.id))
    is_favorited = current_user is not None and await get_favorite(
        db, current_user.id, "prompt", str(prompt.id)
    ) is not None
    data = {
        "id": prompt.id,
        "title": prompt.title,
        "usage": prompt.usage,
        "model": prompt.model,
        "category": prompt.category,
        "preview": prompt.preview,
        "status": prompt.status,
        "favorite_count": favorite_count,
        "is_favorited": is_favorited,
        "created_at": prompt.created_at,
        "updated_at": prompt.updated_at,
    }
    if include_submitter:
        submitter = await db.get(User, prompt.submitter_id) if prompt.submitter_id else None
        data.update({
            "submitter_id": str(prompt.submitter_id) if prompt.submitter_id else None,
            "submitter_name": (submitter.nickname or submitter.username) if submitter else "账号已注销",
            "submitter_cohort": submitter.cohort if submitter else None,
            "submitter_direction": submitter.direction if submitter else None,
            "submitted_at": prompt.submitted_at,
            "reviewed_at": prompt.reviewed_at,
            "review_note": prompt.review_note,
        })
        return PromptReviewResponse.model_validate(data)
    return PromptResponse.model_validate(data)


@router.get("", response_model=list[PromptResponse])
async def get_public_prompts(
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    """公开列表只显示通过审核的模板。"""

    prompts = await list_prompts(db, "approved")
    return [await build_prompt_response(db, prompt, current_user) for prompt in prompts]


@router.get("/mine", response_model=list[PromptReviewResponse])
async def get_my_prompts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    prompts = await list_prompts(db)
    mine = [prompt for prompt in prompts if prompt.submitter_id == current_user.id and prompt.status != "archived"]
    return [await build_prompt_response(db, prompt, current_user, include_submitter=True) for prompt in mine]


@router.get("/review", response_model=list[PromptReviewResponse])
async def get_prompts_for_review(
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    del current_user
    prompts = await list_prompts(db, "pending")
    prompts = [
        prompt
        for prompt in prompts
        if prompt.submitter_id is not None
        and prompt.status != "archived"
    ]
    return [await build_prompt_response(db, prompt, include_submitter=True) for prompt in prompts]


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_public_prompt(
    prompt_id: int,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_database),
):
    prompt = await get_prompt(db, prompt_id)
    if prompt is None or prompt.status != "approved":
        raise HTTPException(status_code=404, detail="Prompt 模板不存在")
    return await build_prompt_response(db, prompt, current_user)


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_managed_prompt(
    data: PromptCreateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    prompt = await create_prompt(
        db, data, status="approved", submitter_id=None, created_by=current_user.id
    )
    await db.commit()
    await db.refresh(prompt)
    return await build_prompt_response(db, prompt, current_user)


@router.post("/submissions", response_model=PromptReviewResponse, status_code=status.HTTP_201_CREATED)
async def submit_prompt(
    data: PromptSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    if current_user.role not in {"Member", "Contributor", "CohortLeader", "Leader", "Admin"}:
        raise HTTPException(status_code=403, detail="当前账号不能投稿 Prompt")

    prompt = await create_prompt(
        db, data, status="pending", submitter_id=current_user.id, created_by=current_user.id
    )
    await notify_content_reviewers(
        db,
        notification_type="prompt_submission_pending",
        title="收到新的 Prompt 投稿",
        content=f"{current_user.nickname or current_user.username} 提交了「{prompt.title}」，等待审核。",
        dedupe_prefix=f"prompt-submit:{prompt.id}",
        link="#/admin",
        exclude_user_id=current_user.id,
        roles={"Leader", "Admin"},
    )
    await db.commit()
    await db.refresh(prompt)
    return await build_prompt_response(db, prompt, current_user, include_submitter=True)


@router.patch("/{prompt_id}", response_model=PromptResponse)
async def edit_managed_prompt(
    prompt_id: int,
    data: PromptUpdateRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    prompt = await get_prompt(db, prompt_id)
    if prompt is None or prompt.status == "archived":
        raise HTTPException(status_code=404, detail="Prompt 模板不存在")
    prompt = await update_prompt(db, prompt, data)
    return await build_prompt_response(db, prompt, current_user)


@router.patch("/{prompt_id}/review", response_model=PromptReviewResponse)
async def review_prompt_submission(
    prompt_id: int,
    data: PromptReviewRequest,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    prompt = await get_prompt(db, prompt_id)
    if prompt is None or prompt.status == "archived":
        raise HTTPException(status_code=404, detail="Prompt 投稿不存在")
    if prompt.submitter_id is None:
        raise HTTPException(status_code=400, detail="这条模板不是成员投稿，不能从投稿中心审核")

    prompt = await update_prompt_review(
        db,
        prompt,
        status=data.status,
        review_note=data.review_note,
        reviewer_id=current_user.id,
    )
    if prompt.submitter_id:
        labels = {
            "approved": "已通过",
            "rejected": "已退回",
            "changes_requested": "需要修改",
        }
        message = f"你的 Prompt「{prompt.title}」审核结果：{labels[data.status]}。"
        if data.review_note:
            message += f" 审核意见：{data.review_note.strip()}"
        await create_notification(
            db,
            user_id=prompt.submitter_id,
            notification_type="prompt_review_result",
            title="Prompt 投稿审核结果",
            content=message,
            link="#/resources/prompts",
            dedupe_key=f"prompt-review:{prompt.id}:v{prompt.version}",
        )
    await db.commit()
    await db.refresh(prompt)
    return await build_prompt_response(db, prompt, include_submitter=True)


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_managed_prompt(
    prompt_id: int,
    current_user: User = Depends(require_leader_or_admin),
    db: AsyncSession = Depends(get_database),
):
    del current_user
    prompt = await get_prompt(db, prompt_id)
    if prompt is None or prompt.status == "archived":
        raise HTTPException(status_code=404, detail="Prompt 模板不存在")
    prompt.status = "archived"
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
