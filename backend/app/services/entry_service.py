from datetime import date, datetime, timedelta, timezone
from typing import Iterable
from uuid import UUID

from supabase import Client

from ..models import EntryDB, EntryTagDB, EntryWithTags
from ..schemas import EntryCreateRequest, EntryQueryParams, EntryUpdateRequest
from .tag_service import get_or_create_tags


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


async def create_entry_with_tags(client: Client, payload: EntryCreateRequest) -> EntryWithTags:
    row: dict = {"content": payload.content, "priority": payload.priority}
    if payload.due_date is not None:
        row["due_date"] = payload.due_date.isoformat()
    insert_resp = client.table("entries").insert(
        row,
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

    return EntryWithTags(
        id=entry.id,
        content=entry.content,
        priority=entry.priority,
        created_at=entry.created_at,
        due_date=getattr(entry, "due_date", None),
        deleted_at=getattr(entry, "deleted_at", None),
        tags=[t.name for t in tags],
    )


async def soft_delete_entry(client: Client, entry_id: UUID) -> None:
    """Mark an entry as completed/deleted (soft delete). Sets deleted_at to now."""
    now = datetime.now(timezone.utc).isoformat()
    resp = client.table("entries").update({"deleted_at": now}).eq("id", str(entry_id)).execute()
    if not resp.data or len(resp.data) == 0:
        raise ValueError("Entry not found")


async def restore_entry(client: Client, entry_id: UUID) -> EntryWithTags:
    """Restore a completed entry (clear deleted_at) so it appears in active tasks again."""
    entry_resp = client.table("entries").select("*").eq("id", str(entry_id)).single().execute()
    if not entry_resp.data:
        raise ValueError("Entry not found")
    resp = client.table("entries").update({"deleted_at": None}).eq("id", str(entry_id)).execute()
    if not resp.data or len(resp.data) == 0:
        raise ValueError("Entry not found")
    entry = EntryDB(**resp.data[0])
    entry_ids_list = [str(entry.id)]
    et_resp = client.table("entry_tags").select("*").in_("entry_id", entry_ids_list).execute()
    et_rows = [EntryTagDB(**row) for row in (et_resp.data or [])]
    tag_ids = sorted({str(r.tag_id) for r in et_rows})
    tags_by_id: dict[str, str] = {}
    if tag_ids:
        tags_resp = client.table("tags").select("*").in_("id", tag_ids).execute()
        tags_by_id = {str(row["id"]): row["name"] for row in (tags_resp.data or [])}
    return _entries_with_tags([entry], et_rows, tags_by_id)[0]


async def delete_entry(client: Client, entry_id: UUID) -> None:
    """Hard delete an entry by id. Prefer soft_delete_entry for user-facing delete."""
    resp = client.table("entries").delete().eq("id", str(entry_id)).execute()
    if not resp.data or len(resp.data) == 0:
        raise ValueError("Entry not found")


async def update_entry(client: Client, entry_id: UUID, payload: EntryUpdateRequest) -> EntryWithTags:
    """Update an entry's content, priority, and tags."""
    entry_resp = client.table("entries").select("*").eq("id", str(entry_id)).single().execute()
    if not entry_resp.data:
        raise ValueError("Entry not found")

    update_row: dict = {
        "content": payload.content,
        "priority": payload.priority,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
    }
    client.table("entries").update(update_row).eq("id", str(entry_id)).execute()

    client.table("entry_tags").delete().eq("entry_id", str(entry_id)).execute()
    tag_models = await get_or_create_tags(client, payload.tags)
    if tag_models:
        rows = [{"entry_id": str(entry_id), "tag_id": str(tag.id)} for tag in tag_models]
        client.table("entry_tags").insert(rows).execute()

    updated = client.table("entries").select("*").eq("id", str(entry_id)).single().execute()
    entry = EntryDB(**updated.data)
    return EntryWithTags(
        id=entry.id,
        content=entry.content,
        priority=entry.priority,
        created_at=entry.created_at,
        due_date=getattr(entry, "due_date", None),
        deleted_at=getattr(entry, "deleted_at", None),
        tags=[t.name for t in tag_models],
    )


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
        priority=entry.priority,
        created_at=entry.created_at,
        due_date=getattr(entry, "due_date", None),
        deleted_at=getattr(entry, "deleted_at", None),
        tags=[t.name for t in tag_models],
    )


def _entries_with_tags(
    entries: list[EntryDB],
    et_rows: list[EntryTagDB],
    tags_by_id: dict[str, str],
) -> list[EntryWithTags]:
    """Build EntryWithTags list from entries and junction/tag data."""
    tags_for_entry: dict[str, list[str]] = {str(e.id): [] for e in entries}
    for link in et_rows:
        eid = str(link.entry_id)
        tid = str(link.tag_id)
        if eid in tags_for_entry and tid in tags_by_id:
            tags_for_entry[eid].append(tags_by_id[tid])
    return [
        EntryWithTags(
            id=e.id,
            content=e.content,
            priority=getattr(e, "priority", "medium"),
            created_at=e.created_at,
            due_date=getattr(e, "due_date", None),
            deleted_at=getattr(e, "deleted_at", None),
            tags=sorted(tags_for_entry.get(str(e.id), [])),
        )
        for e in entries
    ]


async def list_entries(
    client: Client,
    params: EntryQueryParams,
) -> tuple[list[EntryWithTags], int]:
    """
    Return entries with their tags. Supports status (active/completed), due_filter (today/week/month/all),
    search, tag filter, sorting, and pagination. Completed entries older than 30 days are hard-deleted on list.
    """
    # When listing completed, purge entries soft-deleted more than 30 days ago
    if params.status == "completed":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        client.table("entries").delete().not_.is_("deleted_at", "null").lt("deleted_at", cutoff).execute()

    query = client.table("entries").select("*", count="exact")

    # Status: active = not deleted, completed = deleted
    if params.status == "active":
        query = query.is_("deleted_at", "null")
    elif params.status == "completed":
        query = query.not_.is_("deleted_at", "null")

    # Due date filter: explicit range (calendar) or active-only presets
    if params.status == "active" and params.from_date is not None and params.to_date is not None:
        query = query.gte("due_date", params.from_date.isoformat()).lte("due_date", params.to_date.isoformat())
    elif params.status == "active" and params.due_filter != "all":
        today = _today_utc()
        if params.due_filter == "today":
            # Today tab: due today or earlier (includes overdue)
            query = query.lte("due_date", today.isoformat()).not_.is_("due_date", "null")
        elif params.due_filter == "overdue":
            query = query.lt("due_date", today.isoformat())
        elif params.due_filter == "week":
            # ISO week: Monday is day 0
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            query = query.gte("due_date", start.isoformat()).lte("due_date", end.isoformat())
        elif params.due_filter == "month":
            start = today.replace(day=1)
            if today.month == 12:
                end = today.replace(month=12, day=31)
            else:
                end = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))
            query = query.gte("due_date", start.isoformat()).lte("due_date", end.isoformat())

    # Full text style search using ILIKE for simplicity
    if params.search:
        query = query.ilike("content", f"%{params.search}%")

    # Tag filter using a join via entry_tags (tag names are stored lowercase)
    entry_ids_filter: list[str] | None = None
    if params.tag:
        tag_name = params.tag.strip().lower()
        tag_resp = client.table("tags").select("id").eq("name", tag_name).single().execute()
        if not tag_resp.data:
            return [], 0
        tag_id = tag_resp.data["id"]

        et_resp = client.table("entry_tags").select("entry_id").eq("tag_id", tag_id).execute()
        entry_ids_filter = [row["entry_id"] for row in (et_resp.data or [])]
        if not entry_ids_filter:
            return [], 0
        query = query.in_("id", entry_ids_filter)

    ascending = params.order == "asc"

    if params.sort_by == "tags":
        # Sort by tags: fetch all matching entries, attach tags, sort in Python, then slice
        count_resp = query.range(0, 0).execute()
        total_count = count_resp.count or 0
        if total_count == 0:
            return [], 0
        fetch_end = min(total_count - 1, 4999)
        # Rebuild filtered query for data fetch (builder not reused after execute)
        data_query = client.table("entries").select("*")
        if params.status == "active":
            data_query = data_query.is_("deleted_at", "null")
        elif params.status == "completed":
            data_query = data_query.not_.is_("deleted_at", "null")
        if params.status == "active" and params.from_date is not None and params.to_date is not None:
            data_query = data_query.gte("due_date", params.from_date.isoformat()).lte("due_date", params.to_date.isoformat())
        elif params.status == "active" and params.due_filter != "all":
            today = _today_utc()
            if params.due_filter == "today":
                data_query = data_query.lte("due_date", today.isoformat()).not_.is_("due_date", "null")
            elif params.due_filter == "overdue":
                data_query = data_query.lt("due_date", today.isoformat())
            elif params.due_filter == "week":
                start = today - timedelta(days=today.weekday())
                end = start + timedelta(days=6)
                data_query = data_query.gte("due_date", start.isoformat()).lte("due_date", end.isoformat())
            elif params.due_filter == "month":
                start = today.replace(day=1)
                end = (today.replace(month=today.month + 1, day=1) - timedelta(days=1)) if today.month < 12 else today.replace(month=12, day=31)
                data_query = data_query.gte("due_date", start.isoformat()).lte("due_date", end.isoformat())
        if params.search:
            data_query = data_query.ilike("content", f"%{params.search}%")
        if entry_ids_filter is not None:
            data_query = data_query.in_("id", entry_ids_filter)
        full_resp = data_query.order("id", desc=False).range(0, fetch_end).execute()
        raw_entries = full_resp.data or []
        entries = [EntryDB(**row) for row in raw_entries]
        entry_ids_list = [str(e.id) for e in entries]
        et_resp = client.table("entry_tags").select("*").in_("entry_id", entry_ids_list).execute()
        et_rows = [EntryTagDB(**row) for row in (et_resp.data or [])]
        tag_ids = sorted({str(r.tag_id) for r in et_rows})
        tags_resp = client.table("tags").select("*").in_("id", tag_ids).execute()
        tags_by_id = {str(row["id"]): row["name"] for row in (tags_resp.data or [])}
        results = _entries_with_tags(entries, et_rows, tags_by_id)
        results.sort(
            key=lambda e: ",".join(e.tags),
            reverse=not ascending,
        )
        start = params.offset
        end = params.offset + params.limit
        return results[start:end], total_count

    # DB-backed sort (content, created_at)
    sort_column = params.sort_by
    query = query.order(sort_column, desc=not ascending)
    start = params.offset
    end = params.offset + params.limit - 1
    query = query.range(start, end)

    resp = query.execute()
    raw_entries = resp.data or []
    total_count = resp.count or 0
    if not raw_entries:
        return [], total_count

    entries = [EntryDB(**row) for row in raw_entries]
    entry_ids_list = [str(e.id) for e in entries]

    et_resp = client.table("entry_tags").select("*").in_("entry_id", entry_ids_list).execute()
    et_rows = [EntryTagDB(**row) for row in (et_resp.data or [])]
    if not et_rows:
        return _entries_with_tags(entries, [], {}), total_count

    tag_ids = sorted({str(r.tag_id) for r in et_rows})
    tags_resp = client.table("tags").select("*").in_("id", tag_ids).execute()
    tags_by_id = {str(row["id"]): row["name"] for row in (tags_resp.data or [])}

    return _entries_with_tags(entries, et_rows, tags_by_id), total_count

