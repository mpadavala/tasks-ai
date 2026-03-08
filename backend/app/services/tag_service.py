from collections import Counter
from typing import Iterable, Sequence

from supabase import Client

from ..models import TagDB, TagWithUsage


async def get_or_create_tags(client: Client, tag_names: Iterable[str]) -> list[TagDB]:
    """
    Ensure all provided tag names exist and return their TagDB representations.

    Uses a single query to fetch existing tags and a bulk insert for new ones.
    """
    names = sorted({name.strip() for name in tag_names if name.strip()})
    if not names:
        return []

    # Fetch existing tags
    existing_resp = client.table("tags").select("*").in_("name", names).execute()
    existing_tags = [TagDB(**row) for row in (existing_resp.data or [])]
    existing_names = {t.name for t in existing_tags}

    # Insert missing tags
    missing_names = [name for name in names if name not in existing_names]
    new_tags: list[TagDB] = []
    if missing_names:
        insert_payload = [{"name": name} for name in missing_names]
        insert_resp = client.table("tags").insert(
            insert_payload,
            returning="representation",
        ).execute()
        new_tags = [TagDB(**row) for row in (insert_resp.data or [])]

    return existing_tags + new_tags


async def list_tags_with_usage(client: Client, search: str | None = None) -> list[TagWithUsage]:
    """
    Return tags ordered by usage frequency (descending).

    Usage is computed based on the entry_tags junction table to avoid N+1 queries.
    """
    # Fetch all tag_ids used in entry_tags
    et_resp = client.table("entry_tags").select("tag_id").execute()
    tag_ids = [row["tag_id"] for row in (et_resp.data or [])]
    counts = Counter(tag_ids)
    if not counts:
        return []

    # Fetch all involved tags in a single query
    unique_tag_ids = list(counts.keys())
    tags_resp = client.table("tags").select("*").in_("id", unique_tag_ids).execute()
    tags: list[TagDB] = [TagDB(**row) for row in (tags_resp.data or [])]

    # Optionally filter by search on name (case-insensitive)
    if search:
        s_lower = search.lower()
        tags = [t for t in tags if s_lower in t.name.lower()]

    tag_with_usage: list[TagWithUsage] = [
        TagWithUsage(id=t.id, name=t.name, usage_count=counts.get(str(t.id)) or counts.get(t.id) or 0) for t in tags
    ]

    # Sort by usage desc, then name asc for stability
    tag_with_usage.sort(key=lambda t: (-t.usage_count, t.name.lower()))
    return tag_with_usage

