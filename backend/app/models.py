from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EntryDB(BaseModel):
    """Represents a row from the entries table."""

    id: UUID
    content: str
    priority: str = "medium"  # high | medium | low
    created_at: datetime
    due_date: Optional[date] = None
    deleted_at: Optional[datetime] = None
    task_status: str = "not_started"  # not_started | in_progress | done
    parent_id: Optional[UUID] = None


class TagDB(BaseModel):
    """Represents a row from the tags table."""

    id: UUID
    name: str


class EntryTagDB(BaseModel):
    """Represents a row from the entry_tags junction table."""

    entry_id: UUID
    tag_id: UUID


class EntryWithTags(BaseModel):
    """Convenience model representing an entry with its tag names."""

    id: UUID
    content: str
    priority: str = "medium"
    created_at: datetime
    due_date: Optional[date] = None
    deleted_at: Optional[datetime] = None
    task_status: str = "not_started"
    parent_id: Optional[UUID] = None
    tags: list[str] = Field(default_factory=list)
    subtask_count: Optional[int] = None  # Set when listing top-level entries


class TagWithUsage(BaseModel):
    """Tag along with how many times it is used across entries."""

    id: UUID
    name: str
    usage_count: int

