from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin, health, invites, users

app = FastAPI(title="Club OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5180",    #允许这两个前端地址访问后端
        "http://127.0.0.1:5180",
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
app.include_router(invites.router)
