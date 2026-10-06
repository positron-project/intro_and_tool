"""
 @File : init_db.py
 @Author : 加个真朋友
@Description : 
"""
import asyncio

from config.db_conf import Base, engine
from models.audit_logs import AuditLog
from models.announcements import Announcement
from models.cohort_photos import CohortPhoto
from models.learning_routes import LearningRoute
from models.prompts import PromptTemplate
from models.site_settings import SiteSettings
from models.site_copy import SiteCopy
from models.user_preferences import UserPreferences
from models.workbench_settings import WorkbenchSettings
from models.cohorts import Cohort, CohortTeam
from models.email_codes import EmailVerificationCode
from models.invites import InviteCode
from models.members import Member
from models.users import User, UserToken
from models.projects import Project
from models.project_join_requests import ProjectJoinRequest
from models.favorites import Favorite
from models.content_categories import ContentCategory
from models.resources import Resource
from models.resource_submissions import ResourceSubmission
from models.interviews import Interview, InterviewHelpfulVote
from models.competitions import Competition, CompetitionProject, CompetitionReminder
from models.notifications import Notification
from models.feedback import FeedbackMessage


async def create_tables():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
