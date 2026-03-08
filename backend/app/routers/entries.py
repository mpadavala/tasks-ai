from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_supabase_client
from ..schemas import (
    EntryCreateRequest,
    EntryListResponse,
    EntryQueryParams,
    EntryResponse,
    EntryTagsUpdateRequest,
)
from ..services.entry_service import create_entry_with_tags, delete_entry, list_entries, update_entry_tags


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
    sort_by: str = Query(default="created_at", pattern="^(content|created_at)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    client=Depends(get_supabase_client),
) -> EntryListResponse:
    params = EntryQueryParams(
        search=search,
        tag=tag,
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


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry_endpoint(
    entry_id: UUID,
    client=Depends(get_supabase_client),
) -> None:
    try:
        await delete_entry(client, entry_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to delete entry: {exc}") from exc


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

