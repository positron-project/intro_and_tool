"""届次照片接口的数据格式。"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CohortPhotoCreateRequest(BaseModel):
    cohort_id: int = Field(alias="cohortId", ge=1)
    data_url: str = Field(alias="dataUrl", min_length=1, max_length=1000)
    name: str = Field(min_length=1, max_length=255)
    caption: str = Field(min_length=1, max_length=255)
    is_cover: bool = Field(default=False, alias="isCover")

    model_config = ConfigDict(populate_by_name=True)


class CohortPhotoUpdateRequest(BaseModel):
    data_url: str | None = Field(default=None, alias="dataUrl", min_length=1, max_length=1000)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    caption: str | None = Field(default=None, min_length=1, max_length=255)
    is_cover: bool | None = Field(default=None, alias="isCover")

    model_config = ConfigDict(populate_by_name=True)


class CohortPhotoResponse(BaseModel):
    id: str
    cohort_id: str = Field(alias="cohortId")
    data_url: str = Field(alias="dataUrl")
    name: str
    caption: str
    is_cover: bool = Field(alias="isCover")
    created_at: datetime = Field(alias="createdAt")

    @field_validator("id", "cohort_id", mode="before")
    @classmethod
    def ids_as_strings(cls, value: int | str) -> str:
        return str(value)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
