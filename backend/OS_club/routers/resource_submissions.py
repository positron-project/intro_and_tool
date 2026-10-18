"""
 @File : resource_submissions.py.py
 @Author : 加个真朋友
@Description :
"""
"""
资源投稿接口。

普通用户可以：
- 提交资源投稿
- 查看自己的投稿
- 撤回自己的投稿

负责人、组长和管理员可以：
- 负责人只能查看自己届次的投稿
- 组长和管理员可以查看所有投稿
- 审核投稿
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database
from crud.cohorts import get_cohort_by_year
from crud.resource_submissions import (
    create_resource_submission,
    get_resource_submission_by_id,
    list_resource_submissions,
    review_resource_submission,
    withdraw_resource_submission,
)
from crud.resources import create_resource as create_resource_record
from models.users import User
from schemas.resource_submissions import (
    ResourceSubmissionCreateRequest,
    ResourceSubmissionResponse,
    ResourceSubmissionReviewRequest,
)
from schemas.resources import ResourceCreateRequest
from utils.auth import (
    get_current_user,
    require_content_reviewer,
)


router = APIRouter(
    prefix="/api",
    tags=["resource-submissions"],
)


def is_content_reviewer(user: User) -> bool:
    """
    判断用户是否可以审核资源投稿。
    """

    return user.role in {
        "CohortLeader",
        "Leader",
        "Admin",
    }


def cohort_digits(cohort: str | None) -> str:
    """从届次文字中提取年份，兼容“2029”和“2029 届”两种写法。"""

    return "".join(character for character in (cohort or "") if character.isdigit())


def can_review_submission_cohort(
    reviewer: User,
    submitter: User | None,
) -> bool:
    """组长可以审核全部投稿，届次负责人只能审核本届投稿。"""

    if reviewer.role in {"Leader", "Admin"}:
        return True

    if reviewer.role != "CohortLeader" or submitter is None:
        return False

    reviewer_cohort = cohort_digits(reviewer.cohort)
    submitter_cohort = cohort_digits(submitter.cohort)

    return bool(reviewer_cohort and reviewer_cohort == submitter_cohort)


async def can_access_resource_submission(
    db: AsyncSession,
    reviewer: User,
    submission,
) -> bool:
    """检查审核人是否可以查看或处理这条投稿。"""

    if reviewer.role != "CohortLeader":
        return reviewer.role in {"Leader", "Admin"}

    submitter = await db.get(User, submission.submitter_id)
    return can_review_submission_cohort(reviewer, submitter)


async def build_submission_response(
    db: AsyncSession,
    submission,
) -> ResourceSubmissionResponse:
    """
    把数据库投稿模型转换成前端格式。

    submitter_name 不直接保存在投稿表中，
    所以这里根据 submitter_id 查询用户表。
    """

    submitter = await db.get(
        User,
        submission.submitter_id,
    )

    submitter_name = None

    if submitter is not None:
        submitter_name = (
            submitter.nickname
            or submitter.username
        )

    return ResourceSubmissionResponse(
        id=str(submission.id),
        submitter_id=str(submission.submitter_id),
        submitter_name=submitter_name,
        target_resource_id=(
            str(submission.target_resource_id)
            if submission.target_resource_id is not None
            else None
        ),
        title=submission.title,
        description=submission.description,
        category=submission.category,
        resource_type=submission.resource_type,
        access_mode=submission.access_mode,
        tags=submission.tags or [],
        visibility=submission.visibility,
        resource_url=submission.resource_url,
        links=submission.links or [],
        file_name=submission.file_name,
        attachments=submission.attachments or [],
        content=submission.content,
        version=submission.version,
        change_note=submission.change_note,
        status=submission.status,
        review_note=submission.review_note,
        reviewed_by=(
            str(submission.reviewed_by)
            if submission.reviewed_by is not None
            else None
        ),
        reviewed_at=submission.reviewed_at,
        submitted_at=submission.created_at,
        updated_at=submission.updated_at,
    )


@router.post(
    "/resource-submissions",
    response_model=ResourceSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_submission(
    submission_data: ResourceSubmissionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    当前登录用户提交一条资源投稿。
    """

    submission = await create_resource_submission(
        db=db,
        data=submission_data,
        submitter_id=current_user.id,
    )

    return await build_submission_response(
        db=db,
        submission=submission,
    )


@router.get(
    "/resource-submissions",
    response_model=list[ResourceSubmissionResponse],
)
async def get_submissions(
    review_queue_only: bool = Query(default=False, alias="reviewQueueOnly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    获取投稿列表。

    负责人只能查看自己届次的投稿，组长和管理员可以查看全部投稿。
    指定 reviewQueueOnly 时只返回待审核投稿。
    普通用户只能看到自己提交的投稿。
    """

    if review_queue_only and not is_content_reviewer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有审核资源投稿的权限",
        )

    if is_content_reviewer(current_user):
        submissions = await list_resource_submissions(
            db=db,
            submission_status="pending" if review_queue_only else None,
        )
        if current_user.role == "CohortLeader":
            visible_submissions = []
            for submission in submissions:
                if await can_access_resource_submission(
                    db,
                    current_user,
                    submission,
                ):
                    visible_submissions.append(submission)
            submissions = visible_submissions
    else:
        submissions = await list_resource_submissions(
            db=db,
            submitter_id=current_user.id,
        )

    return [
        await build_submission_response(
            db=db,
            submission=submission,
        )
        for submission in submissions
    ]


@router.get(
    "/resource-submissions/{submission_id}",
    response_model=ResourceSubmissionResponse,
)
async def get_submission_detail(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    获取一条投稿详情。

    负责人只能查看自己届次的投稿，组长和管理员可以查看所有投稿。
    普通用户只能查看自己的投稿。
    """

    submission = await get_resource_submission_by_id(
        db=db,
        submission_id=submission_id,
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投稿不存在",
        )

    if is_content_reviewer(current_user):
        if not await can_access_resource_submission(
            db,
            current_user,
            submission,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="负责人只能查看自己届次的资源投稿",
            )
    elif submission.submitter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="不能查看其他用户的投稿",
        )

    return await build_submission_response(
        db=db,
        submission=submission,
    )


@router.post(
    "/resource-submissions/{submission_id}/withdraw",
    response_model=ResourceSubmissionResponse,
)
async def withdraw_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    投稿人撤回自己的投稿。
    """

    submission = await withdraw_resource_submission(
        db=db,
        submission_id=submission_id,
        submitter_id=current_user.id,
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投稿不存在、无权撤回或投稿已经通过审核",
        )

    return await build_submission_response(
        db=db,
        submission=submission,
    )


@router.post(
    "/admin/resource-submissions/{submission_id}/review",
    response_model=ResourceSubmissionResponse,
)
async def review_submission(
    submission_id: int,
    review_data: ResourceSubmissionReviewRequest,
    current_user: User = Depends(require_content_reviewer),
    db: AsyncSession = Depends(get_database),
):
    """
    审核一条资源投稿。

    approve：
        修改投稿状态，并创建正式资源。

    reject：
        拒绝投稿。

    request_changes：
        要求投稿人修改后重新提交。
    """

    submission = await get_resource_submission_by_id(
        db=db,
        submission_id=submission_id,
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投稿不存在",
        )

    if submission.status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该投稿已经审核通过",
        )

    submitter = await db.get(
        User,
        submission.submitter_id,
    )
    if not can_review_submission_cohort(current_user, submitter):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="负责人只能审核自己届次的资源投稿",
        )

    if review_data.action == "approve" and submitter is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投稿用户不存在",
        )

    resource_cohort_id = None
    if review_data.action == "approve" and submitter is not None:
        submitter_cohort_year = cohort_digits(submitter.cohort)
        if submitter_cohort_year:
            submitter_cohort = await get_cohort_by_year(
                db,
                submitter_cohort_year,
            )
            if submitter_cohort is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="投稿用户所属届次不存在，无法创建正式资源",
                )
            resource_cohort_id = submitter_cohort.id

    submission = await review_resource_submission(
        db=db,
        submission_id=submission_id,
        reviewer_id=current_user.id,
        reviewer_name=current_user.nickname or current_user.username,
        data=review_data,
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投稿不存在",
        )

    # 只有审核通过时，才创建正式资源。
    if review_data.action == "approve":
        author_name = (
            submitter.nickname
            or submitter.username
        )

        resource_data = ResourceCreateRequest(
            title=submission.title,
            description=submission.description,
            category=submission.category,
            resource_type=submission.resource_type,
            access_mode=submission.access_mode,
            tags=submission.tags or [],
            author=author_name,
            visibility=submission.visibility,
            resource_url=submission.resource_url,
            links=submission.links or [],
            attachments=submission.attachments or [],
            content=submission.content,
        )

        await create_resource_record(
            db=db,
            data=resource_data,
            created_by=submission.submitter_id,
            cohort_id=resource_cohort_id,
        )

    return await build_submission_response(
        db=db,
        submission=submission,
    )
