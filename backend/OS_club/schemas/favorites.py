"""内容收藏接口数据模型。"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


FavoriteTargetType = Literal["project", "resource", "interview", "prompt"]


class FavoriteCreateRequest(BaseModel):
    """新增收藏时接收的数据。"""

    target_type: FavoriteTargetType = Field(alias="targetType")
    target_id: str = Field(
        alias="targetId",
        min_length=1,
        max_length=150,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )


class FavoriteResponse(BaseModel):
    """返回收藏状态和当前收藏数量。"""

    id: int | None = None
    target_type: FavoriteTargetType = Field(alias="targetType")
    target_id: str = Field(alias="targetId")
    is_favorited: bool = Field(alias="isFavorited")
    favorite_count: int = Field(
        default=0,
        alias="favoriteCount",
        ge=0,
    )
    created_at: datetime | None = Field(
        default=None,
        alias="createdAt",
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
