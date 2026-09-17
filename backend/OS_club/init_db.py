"""
 @File : init_db.py
 @Author : 加个真朋友
@Description : 
"""
import asyncio

from config.db_conf import Base, engine
from models.invites import InviteCode
from models.users import User, UserToken


async def create_tables():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
