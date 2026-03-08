from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


Priority = Literal["high", "medium", "low"]


class EntryCreateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    priority: Priority = "medium"
    tags: list[str] = Field(default_factory=list)
    due_date: Optional[date] = None


class EntryResponse(BaseModel):
    id: UUID
    content: str
    priority: str = "medium"
    created_at: datetime
    due_date: Optional[date] = None
    deleted_at: Optional[datetime] = None
    tags: list[str] = Field(default_factory=list)


SortBy = Literal["content", "created_at", "tags", "priority"]
SortOrder = Literal["asc", "desc"]


StatusFilter = Literal["active", "completed"]
DueFilter = Literal["all", "today", "week", "month"]


class EntryQueryParams(BaseModel):
    search: str | None = None
    tag: str | None = None
    status: StatusFilter = "active"
    due_filter: DueFilter = "all"
    sort_by: SortBy = "created_at"
    order: SortOrder = "desc"
    limit: int = 20
    offset: int = 0


class EntryListResponse(BaseModel):
    items: list[EntryResponse]
    total: int


class EntryTagsUpdateRequest(BaseModel):
    tags: list[str] = Field(default_factory=list)


class EntryUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1)
    priority: Priority = "medium"
    tags: list[str] = Field(default_factory=list)
    due_date: Optional[date] = None


class TagResponse(BaseModel):
    id: UUID
    name: str
    usage_count: int


class TagListResponse(BaseModel):
    items: list[TagResponse]

