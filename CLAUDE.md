# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StocksAI is a full-stack task management application. The name is misleading — it's a productivity tool for creating, organizing, and filtering entries with tags, priorities, and due dates.

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Backend (FastAPI)
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload  # Start dev server (http://localhost:8000)
```

## Architecture

### Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React 19
- **Backend:** FastAPI, Pydantic v2, Uvicorn
- **Database:** PostgreSQL via Supabase client

### Structure
```
frontend/
  app/page.tsx          # Main dashboard (single page, client component)
  components/           # UI components
  lib/api.ts            # All backend API calls centralized here

backend/
  app/
    main.py             # FastAPI app, CORS config
    config.py           # Settings from .env
    database.py         # Supabase client
    models.py           # DB models (Pydantic)
    schemas.py          # Request/response schemas
    routers/            # HTTP endpoints (entries.py, tags.py)
    services/           # Business logic (entry_service.py, tag_service.py)
```

### Data Model
- `entries` — content, priority (high/medium/low), due_date, task_status (not_started/in_progress/done), parent_id, deleted_at
- `tags` — name (unique)
- `entry_tags` — junction table (many-to-many)

Soft deletes: entries use `deleted_at` timestamp; `POST /entries/{id}/restore` reverts.

### API Endpoints
- `GET/POST /entries` — list (with filtering/pagination) and create
- `PUT /entries/{id}` — update entry
- `PATCH /entries/{id}/status` — update task status only
- `PUT /entries/{id}/tags` — replace entry tags
- `DELETE /entries/{id}` — soft delete
- `POST /entries/{id}/restore` — restore deleted entry
- `GET /tags` — list tags with usage count

All API calls go through `frontend/lib/api.ts`.

### Key Patterns
- Backend: routers → services → Supabase client (injected via FastAPI `Depends()`)
- Frontend: single-page app with tab-based filtering (today/week/month/all/overdue/completed/calendar)
- `ResultsTable.tsx` is the largest component (~33KB) handling the main entry display and interactions
- Drag-and-drop via `@dnd-kit`; date picking via `react-day-picker`
- Dark mode via ThemeProvider context using `.dark` CSS class

### Environment
- Backend `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_ORIGIN`
- Frontend `.env`: not required for local dev (defaults to localhost)
