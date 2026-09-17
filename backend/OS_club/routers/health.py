"""
 @File : health.py
 @Author : 加个真朋友
@Description : 
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])
@router.get("/health")
async def health():
    return {
        "code": 200,
        "msg": "ok",
        "data": {
            "service": "club-os-backend",
            "status": "up",
        },
    }