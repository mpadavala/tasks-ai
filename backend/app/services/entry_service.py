from typing import Iterable
from uuid import UUID

from supabase import Client

from ..models import EntryDB, EntryTagDB, EntryWithTags
from ..schemas import EntryCreateRequest, EntryQueryParams
from .tag_service import get_or_create_tags


async def create_entry_with_tags(client: Client, payload: EntryCreateRequest) -> EntryWithTags:
    # Create entry
    insert_resp = client.table("entries").insert(
        {"content": payload.content},
        returning="representation",
    ).execute()
    if not insert_resp.data:
        raise RuntimeError("Failed to create entry")
    entry = EntryDB(**insert_resp.data[0])

    # Ensure tags exist
    tags = await get_or_create_tags(client, payload.tags)

    # Link entry to tags in a single bulk insert
    if tags:
        junction_rows = [{"entry_id": str(entry.id), "tag_id": str(tag.id)} for tag in tags]
        client.table("entry_tags").insert(junction_rows).execute()

    return EntryWithTags(id=entry.id, content=entry.content, created_at=entry.created_at, tags=[t.name for t in tags])


async def delete_entry(client: Client, entry_id: UUID) -> None:
    """Delete an entry by id. entry_tags are removed by DB cascade."""
    resp = client.table("entries").delete().eq("id", str(entry_id)).execute()
    # Supabase delete returns the deleted rows; if nothing deleted, entry didn't exist
    if not resp.data or len(resp.data) == 0:
        raise ValueError("Entry not found")


async def update_entry_tags(client: Client, entry_id: UUID, tags: Iterable[str]) -> EntryWithTags:
    # Ensure entry exists and fetch it
    entry_resp = client.table("entries").select("*").eq("id", str(entry_id)).single().execute()
    if not entry_resp.data:
        raise ValueError("Entry not found")
    entry = EntryDB(**entry_resp.data)

    # Remove existing entry_tags
    client.table("entry_tags").delete().eq("entry_id", str(entry.id)).execute()

    # Ensure new tags exist
    tag_models = await get_or_create_tags(client, tags)

    # Recreate links
    if tag_models:
        rows = [{"entry_id": str(entry.id), "tag_id": str(tag.id)} for tag in tag_models]
        client.table("entry_tags").insert(rows).execute()

    return EntryWithTags(
        id=entry.id,
        content=entry.content,
        created_at=entry.created_at,
        tags=[t.name for t in tag_models],
    )


async def list_entries(
    client: Client,
    params: EntryQueryParams,
) -> tuple[list[EntryWithTags], int]:
    """
    Return entries with their tags, supporting search, tag filter, sorting, and pagination.

    To avoid N+1 queries, this function:
    - Fetches entries with filters and pagination
    - Fetches entry_tags for the result set
    - Fetches involved tags in a single query
    """
    query = client.table("entries").select("*", count="exact")

    # Full text style search using ILIKE for simplicity
    if params.search:
        query = query.ilike("content", f"%{params.search}%")

    # Tag filter using a join via entry_tags
    if params.tag:
        # Find tag id for provided name
        tag_resp = client.table("tags").select("id").eq("name", params.tag).single().execute()
        if not tag_resp.data:
            return [], 0
        tag_id = tag_resp.data["id"]

        et_resp = client.table("entry_tags").select("entry_id").eq("tag_id", tag_id).execute()
        entry_ids = [row["entry_id"] for row in (et_resp.data or [])]
        if not entry_ids:
            return [], 0
        query = query.in_("id", entry_ids)

    # Sorting
    sort_column = params.sort_by
    ascending = params.order == "asc"
    query = query.order(sort_column, desc=not ascending)

    # Pagination
    # Supabase range is inclusive, so last index is offset + limit - 1
    start = params.offset
    end = params.offset + params.limit - 1
    query = query.range(start, end)

    resp = query.execute()
    raw_entries = resp.data or []
    total_count = resp.count or 0
    if not raw_entries:
        return [], total_count

    entries = [EntryDB(**row) for row in raw_entries]
    entry_ids = [str(e.id) for e in entries]

    # Fetch junction rows for these entries
    et_resp = client.table("entry_tags").select("*").in_("entry_id", entry_ids).execute()
    et_rows = [EntryTagDB(**row) for row in (et_resp.data or [])]
    if not et_rows:
        return [
            EntryWithTags(id=e.id, content=e.content, created_at=e.created_at, tags=[])
            for e in entries
        ], total_count

    tag_ids = sorted({str(r.tag_id) for r in et_rows})
    tags_resp = client.table("tags").select("*").in_("id", tag_ids).execute()
    tag_rows = tags_resp.data or []
    tags_by_id = {str(row["id"]): row["name"] for row in tag_rows}

    tags_for_entry: dict[str, list[str]] = {str(e.id): [] for e in entries}
    for link in et_rows:
        eid = str(link.entry_id)
        tid = str(link.tag_id)
        if eid in tags_for_entry and tid in tags_by_id:
            tags_for_entry[eid].append(tags_by_id[tid])

    results: list[EntryWithTags] = []
    for e in entries:
        eid = str(e.id)
        results.append(
            EntryWithTags(
                id=e.id,
                content=e.content,
                created_at=e.created_at,
                tags=sorted(tags_for_entry.get(eid, [])),
            )
        )

    return results, total_count

