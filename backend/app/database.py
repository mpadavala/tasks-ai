from typing import Any

from supabase import Client, create_client

from .config import get_settings


supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Lazily create and cache a Supabase client.

    The client is shared across requests, which is fine because the official
    Supabase Python client is thread-safe for typical usage.
    """
    global supabase_client
    if supabase_client is None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError("Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
    return supabase_client


def reset_supabase_client() -> None:
    """
    Helper primarily for testing to reset the global client.
    """
    global supabase_client
    supabase_client = None

