"""Prompt 模板的数据库读写操作。"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.prompts import PromptTemplate
from schemas.prompts import PromptFields, PromptUpdateRequest


async def list_prompts(db: AsyncSession, status: str | None = None) -> list[PromptTemplate]:
    query = select(PromptTemplate)
    if status is not None:
        query = query.where(PromptTemplate.status == status)
    return list((await db.execute(query.order_by(PromptTemplate.created_at.desc()))).scalars().all())


async def get_prompt(db: AsyncSession, prompt_id: int) -> PromptTemplate | None:
    return await db.get(PromptTemplate, prompt_id)


async def create_prompt(
    db: AsyncSession,
    data: PromptFields,
    *,
    status: str,
    submitter_id: int | None,
    created_by: int | None,
) -> PromptTemplate:
    values = data.model_dump()
    for key, value in values.items():
        if isinstance(value, str):
            values[key] = value.strip()

    prompt = PromptTemplate(
        **values,
        status=status,
        submitter_id=submitter_id,
        submitted_at=None if status == "approved" else datetime.now(),
        created_by=created_by,
    )
    db.add(prompt)
    await db.flush()
    return prompt


async def update_prompt(
    db: AsyncSession,
    prompt: PromptTemplate,
    data: PromptUpdateRequest,
) -> PromptTemplate:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(prompt, key, value.strip() if isinstance(value, str) else value)
    await db.commit()
    await db.refresh(prompt)
    return prompt


async def update_prompt_review(
    db: AsyncSession,
    prompt: PromptTemplate,
    *,
    status: str,
    review_note: str | None,
    reviewer_id: int,
) -> PromptTemplate:
    prompt.status = status
    prompt.review_note = review_note.strip() if review_note else None
    prompt.reviewed_by = reviewer_id
    prompt.reviewed_at = datetime.now()
    prompt.version += 1
    await db.flush()
    return prompt
