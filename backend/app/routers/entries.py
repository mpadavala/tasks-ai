from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_supabase_client
from ..schemas import (
    EntryCreateRequest,
    EntryListResponse,
    EntryQueryParams,
    EntryResponse,
    EntryStatusUpdateRequest,
    EntryTagsUpdateRequest,
    EntryUpdateRequest,
)
from ..services.entry_service import (
    create_entry_with_tags,
    list_entries,
    restore_entry,
    soft_delete_entry,
    update_entry,
    update_entry_status,
    update_entry_tags,
)


router = APIRouter(prefix="/entries", tags=["entries"])


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(body: EntryCreateRequest, client=Depends(get_supabase_client)) -> EntryResponse:
    try:
        entry = await create_entry_with_tags(client, body)
        return EntryResponse(**entry.model_dump())
    except Exception as exc:  # pragma: no cover - generic safety net
        raise HTTPException(status_code=500, detail=f"Failed to create entry: {exc}") from exc


@router.get("", response_model=EntryListResponse)
async def get_entries(
    search: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    status: str = Query(default="active", pattern="^(active|completed)$"),
    due_filter: str = Query(default="all", pattern="^(all|today|week|month|overdue)$"),
    from_date: str | None = Query(default=None, pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    to_date: str | None = Query(default=None, pattern="^\\d{4}-\\d{2}-\\d{2}$"),
    parent_id: str | None = Query(default=None, description="UUID of parent task; omit for top-level only"),
    sort_by: str = Query(default="created_at", pattern="^(content|created_at|tags|priority|due_date)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=20, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    client=Depends(get_supabase_client),
) -> EntryListResponse:
    from_date_parsed = date_type.fromisoformat(from_date) if from_date else None
    to_date_parsed = date_type.fromisoformat(to_date) if to_date else None
    parent_id_parsed = UUID(parent_id) if parent_id else None
    params = EntryQueryParams(
        search=search,
        tag=tag,
        status=status,  # type: ignore[arg-type]
        due_filter=due_filter,  # type: ignore[arg-type]
        from_date=from_date_parsed,
        to_date=to_date_parsed,
        parent_id=parent_id_parsed,
        sort_by=sort_by,  # type: ignore[arg-type]
        order=order,  # type: ignore[arg-type]
        limit=limit,
        offset=offset,
    )
    try:
        items, total = await list_entries(client, params)
        return EntryListResponse(
            items=[EntryResponse(**item.model_dump()) for item in items],
            total=total,
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to fetch entries: {exc}") from exc


@router.patch("/{entry_id}/status", response_model=EntryResponse)
async def update_entry_status_endpoint(
    entry_id: UUID,
    body: EntryStatusUpdateRequest,
    client=Depends(get_supabase_client),
) -> EntryResponse:
    """Update task status (Not Started, In Progress, Done). Setting to Done moves the task to Completed."""
    try:
        entry = await update_entry_status(client, entry_id, body.task_status)
        return EntryResponse(**entry.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to update status: {exc}") from exc


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry_endpoint(
    entry_id: UUID,
    client=Depends(get_supabase_client),
) -> None:
    """Soft delete (complete) the entry. It moves to Completed and is hard-deleted after 30 days."""
    try:
        await soft_delete_entry(client, entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {exc}") from exc


@router.post("/{entry_id}/restore", response_model=EntryResponse)
async def restore_entry_endpoint(
    entry_id: UUID,
    client=Depends(get_supabase_client),
) -> EntryResponse:
    """Restore a completed entry so it appears in active tasks again."""
    try:
        entry = await restore_entry(client, entry_id)
        return EntryResponse(**entry.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to restore entry: {exc}") from exc


@router.put("/{entry_id}", response_model=EntryResponse)
async def update_entry_endpoint(
    entry_id: UUID,
    body: EntryUpdateRequest,
    client=Depends(get_supabase_client),
) -> EntryResponse:
    try:
        entry = await update_entry(client, entry_id, body)
        return EntryResponse(**entry.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to update entry: {exc}") from exc


@router.put("/{entry_id}/tags", response_model=EntryResponse)
async def update_entry_tags_endpoint(
    entry_id: UUID,
    body: EntryTagsUpdateRequest,
    client=Depends(get_supabase_client),
) -> EntryResponse:
    try:
        entry = await update_entry_tags(client, entry_id, body.tags)
        return EntryResponse(**entry.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to update entry tags: {exc}") from exc

