from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class EntryCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)


class EntryResponse(BaseModel):
    id: UUID
    content: str
    created_at: datetime
    tags: list[str] = Field(default_factory=list)


SortBy = Literal["content", "created_at", "tags"]
SortOrder = Literal["asc", "desc"]


class EntryQueryParams(BaseModel):
    search: str | None = None
    tag: str | None = None
    sort_by: SortBy = "created_at"
    order: SortOrder = "desc"
    limit: int = 20
    offset: int = 0


class EntryListResponse(BaseModel):
    items: list[EntryResponse]
    total: int


class EntryTagsUpdateRequest(BaseModel):
    tags: list[str] = Field(default_factory=list)


class TagResponse(BaseModel):
    id: UUID
    name: str
    usage_count: int


class TagListResponse(BaseModel):
    items: list[TagResponse]

