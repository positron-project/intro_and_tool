import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import announcements, club_config, learning_routes, prompts, settings, user_preferences, workbench_settings
from routers import admin, audit_logs, categories, cohorts, competitions, favorites, feedback, health, invites, notifications, project_self, users, members, projects, resource_submissions, resources, uploads, interviews
from tasks.competition_reminders import create_due_competition_reminders


logger = logging.getLogger(__name__)


async def competition_reminder_loop():
    """每分钟检查一次；数据库唯一键负责防止重复通知。"""

    while True:
        try:
            created_count = await create_due_competition_reminders()
            if created_count:
                logger.info("Created %s competition reminder notifications", created_count)
        except asyncio.CancelledError:
            raise
        except Exception:
            # 暂时失败时记录错误，下一轮仍会继续检查。
            logger.exception("Competition reminder check failed")

        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """服务启动时开启提醒检查，关闭时结束后台任务。"""

    reminder_task = asyncio.create_task(competition_reminder_loop())
    try:
        yield
    finally:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Club OS API", lifespan=lifespan)

UPLOAD_ROOT = Path(__file__).resolve().parent / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5180",    # 允许本机的 Vite 开发地址访问后端
        "http://127.0.0.1:5180",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


app.include_router(health.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(audit_logs.router)
app.include_router(invites.router)
app.include_router(cohorts.router)
app.include_router(members.router)
app.include_router(project_self.router)
app.include_router(projects.router)
app.include_router(favorites.router)
app.include_router(categories.router)
app.include_router(uploads.router)
app.include_router(resources.router)
app.include_router(resource_submissions.router)
app.include_router(interviews.router)
app.include_router(competitions.router)
app.include_router(announcements.router)
app.include_router(prompts.router)
app.include_router(club_config.router)
app.include_router(learning_routes.router)
app.include_router(settings.router)
app.include_router(user_preferences.router)
app.include_router(workbench_settings.router)
app.include_router(notifications.router)
app.include_router(feedback.router)
