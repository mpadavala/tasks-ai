from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import entries, tags


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="StocksAI Entries API", version="1.0.0")

    # CORS for Next.js frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(entries.router)
    app.include_router(tags.router)

    return app


app = create_app()

