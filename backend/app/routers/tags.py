from fastapi import APIRouter, Depends, Query, status

from ..database import get_supabase_client
from ..schemas import TagListResponse, TagResponse
from ..services.tag_service import list_tags_with_usage


router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=TagListResponse, status_code=status.HTTP_200_OK)
async def get_tags(
    search: str | None = Query(default=None),
    client=Depends(get_supabase_client),
) -> TagListResponse:
    tags = await list_tags_with_usage(client, search)
    return TagListResponse(
        items=[
            TagResponse(id=t.id, name=t.name, usage_count=t.usage_count)
            for t in tags
        ]
    )

