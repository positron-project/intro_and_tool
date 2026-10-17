import asyncio
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database #获取数据库会话；
from crud.email_codes import (
    EMAIL_CODE_COOLDOWN_SECONDS,
    EMAIL_CODE_EXPIRE_MINUTES,
    create_email_verification_code,
    consume_latest_email_verification_code,
    expire_email_verification_code,
    has_recent_email_verification_code,
)
from models.users import User #导入用户表模型；
from crud.invites import redeem_invite_code     #调用 crud/invites.py 中已经写好的邀请码兑换逻辑。
from schemas.users import RegisterRequest, UserInfoResponse, ProfileUpdateRequest
from schemas.invites import InviteCodeRedeemRequest #接收前端传来的邀请码
from utils.security import hash_password #导入密码加密函数。
from crud.users import (
    authenticate_user,
    create_login_token,
    close_user_account,
    get_user_by_email,
    revoke_login_token,
    change_password as change_user_password,
    update_user_profile,
)
from utils.auth import get_current_user
from schemas.auth import (
    EmailCodeSendRequest,
    LoginCodeRequest,
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
    RegistrationEmailCodeSendRequest,
)
from utils.email_sender import send_verification_email
from utils.turnstile import TurnstileVerificationError, verify_turnstile_token


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
)
logger = logging.getLogger(__name__)


async def _verify_turnstile_or_raise(token: str) -> None:
    """向 Cloudflare 核验 token；无法核验和核验失败都停止后续操作。"""

    try:
        is_valid = await verify_turnstile_token(token)
    except TurnstileVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="人机验证未通过，请重新验证",
        )


async def _send_email_verification_code(
    db: AsyncSession,
    email: str,
    purpose: str,
) -> dict[str, int]:
    """检查冷却时间、保存验证码并发送邮件。"""

    if await has_recent_email_verification_code(db, email, purpose):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请等待 {EMAIL_CODE_COOLDOWN_SECONDS} 秒后再获取验证码",
        )

    verification_code = await create_email_verification_code(
        db,
        email,
        purpose,
    )
    try:
        # 邮件 API 请求是同步网络操作，放进工作线程避免阻塞异步事件循环。
        await asyncio.to_thread(
            send_verification_email,
            email,
            verification_code.code,
            purpose,
        )
    except Exception as exc:
        logger.exception("Email API request failed for purpose=%s", purpose)
        await expire_email_verification_code(db, verification_code)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="邮件发送失败，请稍后重试",
        ) from exc

    return {"expiresInSeconds": EMAIL_CODE_EXPIRE_MINUTES * 60}



# 发送注册验证码接口
@router.post("/register/send-code")
async def send_registration_email_code(
    request_data: RegistrationEmailCodeSendRequest,
    db: AsyncSession = Depends(get_database),
):
    """核验人机 token 后，向尚未注册的邮箱发送注册码。"""

    await _verify_turnstile_or_raise(request_data.turnstile_token)
    email = str(request_data.email).strip().lower()

    existing_user = await db.scalar(
        select(User.id).where(User.email == email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该邮箱已注册",
        )

    return await _send_email_verification_code(
        db,
        email,
        "register",
    )



# 发送登录验证码接口
@router.post("/login/send-code")
async def send_login_email_code(
    request_data: EmailCodeSendRequest,
    db: AsyncSession = Depends(get_database),
):
    """核验人机 token 后，向已注册且可用的邮箱发送登录码。"""

    await _verify_turnstile_or_raise(request_data.turnstile_token)
    email = str(request_data.email).strip().lower()

    user = await db.scalar(
        select(User).where(User.email == email)
    )
    # 对未注册或不可用账号返回相同结果，避免通过接口探测邮箱是否注册。
    if user is None or user.status != "active":
        return {"expiresInSeconds": EMAIL_CODE_EXPIRE_MINUTES * 60}

    return await _send_email_verification_code(
        db,
        email,
        "login",
    )


@router.post( #注册用户接口
    "/register",
    response_model=UserInfoResponse, #注册成功后返回 UserInfoResponse；
    status_code=status.HTTP_200_OK, #统一业务约定：HTTP 200 且业务 code=200 表示成功。
)
async def register(
    register_data: RegisterRequest, #只用于接收注册数据
    db: AsyncSession = Depends(get_database),
):
    email = str(register_data.email).lower() #统一邮箱格式 把邮箱转成字符串并转换为小写 避免当成两个邮箱

    result = await db.execute( #检查重复用户 查询用户名或邮箱是否已经存在。
        select(User).where(
            (User.username == register_data.username)
            | (User.email == email)
        )
    )

    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, #查询用户名或邮箱是否已经存在。 返回 409 错误，表示发生数据冲突。
            detail="用户名或邮箱已存在",
        )

    await _verify_turnstile_or_raise(register_data.turnstile_token)

    code_is_valid = await consume_latest_email_verification_code(
        db,
        email,
        register_data.verification_code,
        "register",
    )
    if not code_is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱验证码不正确、已过期或已使用",
        )

    user = User( #创建用户对象
        username=register_data.username,
        email=email,
        password_hash=hash_password(register_data.password),
    )

    db.add(user)

    await db.commit() #把新用户放进当前数据库会话。
    await db.refresh(user) #重新读取数据库生成的字段

    return user #返回用户信息



#密码登入
@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_database),
):
    # 前端传来的 token 只是待核验凭证，不代表验证已经可信地通过。
    # 必须由后端使用只保存在服务器上的密钥向 Cloudflare 核验，避免有人绕过网页直接调用登录接口。
    # 将核验放在查用户和校验密码之前，也能阻止未完成人机验证的请求反复尝试账号密码。
    await _verify_turnstile_or_raise(login_data.turnstile_token)

    user = await authenticate_user(
        db,
        str(login_data.email),
        login_data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 邮箱和密码都正确后，再根据账号状态给出明确提示。
    # 错误邮箱或错误密码仍然统一返回上面的提示，避免暴露账号是否存在。
    if user.status == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被管理员禁用，请联系管理员",
        )

    if user.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已注销，无法继续登录",
        )

    token = await create_login_token(
        db,
        user.id,
    )

    return LoginResponse(
        access_token=token,
        user=user,
    )



# 验证码登入
@router.post(
    "/login/code",
    response_model=LoginResponse,
)
async def login_with_email_code(
    login_data: LoginCodeRequest,
    db: AsyncSession = Depends(get_database),
):
    """核验 Turnstile 和邮箱验证码后创建登录令牌。"""

    await _verify_turnstile_or_raise(login_data.turnstile_token)
    email = str(login_data.email).strip().lower()

    user = await db.scalar(
        select(User).where(User.email == email)
    )
    if user is None or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或验证码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    code_is_valid = await consume_latest_email_verification_code(
        db,
        email,
        login_data.verification_code,
        "login",
    )
    if not code_is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或验证码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = await create_login_token(
        db,
        user.id,
    )

    return LoginResponse(
        access_token=token,
        user=user,
    )


"""个人中心相关接口"""

# 查自己
@router.get(
    "/me",
    response_model=UserInfoResponse,
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user


#注销自己
@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def close_current_user_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    注销当前登录账号。

    账号不会从数据库物理删除，而是改为 closed 状态；
    注销成功后，原登录令牌也会立即失效。
    """

    await close_user_account(
        db=db,
        user=current_user,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)



@router.post(
    "/me/redeem-invite",
    response_model=UserInfoResponse,
)
async def redeem_current_user_invite(
    invite_data: InviteCodeRedeemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    """
    当前登录用户兑换邀请码。

    兑换成功后，普通成员会升级为邀请码指定的角色，默认是 Contributor（组员）。
    """

    try:
        # 调用 CRUD 层完成：
        # 1. 查询邀请码
        # 2. 检查邀请码是否存在、过期、撤销或用完
        # 3. 检查当前账号是否为普通成员
        # 4. 增加邀请码使用次数
        # 5. 修改当前用户角色
        # 6. 提交数据库
        await redeem_invite_code(       #调用 CRUD 层完成真正的兑换操作
            db=db,      #数据库会话
            code=invite_data.invite_code,   #接收前端的邀请码
            user=current_user,      #通过登录令牌找到当前用户
        )

    except ValueError as error:
        # CRUD 层发现业务问题时会抛出 ValueError。
        # 把它转换成前端能识别的 HTTP 400 错误。
        raise HTTPException(        #把错误转换成 HTTP 响应
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    # CRUD 函数已经修改并刷新了 current_user，
    # 所以这里返回更新后的用户资料。
    return current_user     #返回升级后的用户信息



#改资料
@router.patch(
    "/me",
    response_model=UserInfoResponse,
)
async def update_current_user_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    return await update_user_profile(
        db=db,
        user=current_user,
        profile_data=profile_data,
    )


# 退出登录
@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    authorization: str | None = Header(
        default=None,
        alias="Authorization",
    ),
    db: AsyncSession = Depends(get_database),
):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录令牌格式错误",
        )

    await revoke_login_token(
        db,
        token.strip(),
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)



#改密码
@router.patch(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_database),
):
    success = await change_user_password(
        db=db,
        user=current_user,
        current_password=password_data.current_password,
        new_password=password_data.new_password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
