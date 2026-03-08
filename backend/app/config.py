from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    supabase_url: str = ""
    supabase_service_key: str = ""
    frontend_origin: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = ""


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

