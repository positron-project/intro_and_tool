from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.db_conf import get_database #获取数据库会话；
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
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["auth"],
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

    user = User( #创建用户对象
        username=register_data.username,
        email=email,
        password_hash=hash_password(register_data.password),
    )

    db.add(user)

    await db.commit() #把新用户放进当前数据库会话。
    await db.refresh(user) #重新读取数据库生成的字段

    return user #返回用户信息



#登入
@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_database),
):
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


@router.get(
    "/me",
    response_model=UserInfoResponse,
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    return current_user


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
