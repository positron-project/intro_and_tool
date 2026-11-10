"""
 @File : db_conf.py
 @Author : 加个真朋友
@Description : 
"""
import os
from collections.abc import AsyncGenerator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_FILE)

DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_HOST = os.environ["DB_HOST"]
DB_PORT = os.environ["DB_PORT"]
DB_NAME = os.environ["DB_NAME"]


# #ASYNC_DATABASE_URL = (
#     "mysql+asyncmy://root:123456@127.0.0.1:3306/"
#     "club_os?charset=utf8mb4"
# )

ASYNC_DATABASE_URL = (
    f"mysql+asyncmy://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/"
    f"{DB_NAME}?charset=utf8mb4"
)


engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
)


SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_database():
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
