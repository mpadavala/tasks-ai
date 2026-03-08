# Local Deployment Guide

This document explains, in detail, how to run the **StocksAI** full‑stack application locally, including database setup and how to validate each step.

The stack is:

- **Backend**: FastAPI + Supabase PostgreSQL (via Supabase Python client)
- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS)

---

## 1. Prerequisites

### 1.1. Install required tools

- **Node.js**: v18+ (recommended: latest LTS)
  - Validate:
    - Run `node -v` → should print something like `v18.x.x` or newer.
    - Run `npm -v` → should print a numeric version.
- **Python**: 3.11+ (3.10+ should also work)
  - Validate:
    - Run `python3 --version` (or `python --version`) → should print `Python 3.10+`.
- **Git** (optional but recommended).

If any of these commands are missing or outdated, install them before continuing (e.g., via `brew`, `pyenv`, `nvm`, etc.).

---

## 2. Supabase PostgreSQL Database Setup

You will use a **Supabase project** as the PostgreSQL database. This avoids managing a local Postgres instance while still giving you a full Postgres + SQL experience.

### 2.1. Create a Supabase project

1. Go to the Supabase dashboard: `https://supabase.com/`.
2. Sign in or create an account.
3. Click **New project**.
4. Choose:
   - **Organization**: any (or create a new one).
   - **Project name**: e.g. `stocksai-local`.
   - **Database password**: choose a secure password and store it in a safe place.
   - **Region**: choose a region close to you.
5. Click **Create new project** and wait until Supabase finishes provisioning (1–2 minutes).

**Validation**

- In the Supabase dashboard, open your new project and ensure:
  - The **Project Status** is shown as **Healthy** or **Running**.
  - You can access the **Table Editor** and **SQL Editor** tabs.

### 2.2. Create the database schema

You’ll now create the `entries`, `tags`, and `entry_tags` tables and all required indexes.

1. In your Supabase project, go to the **SQL Editor**.
2. Create a new query and paste the following SQL:

```sql
-- Enable required extension for UUID generation (if not already enabled)
create extension if not exists "pgcrypto";

-- Entries table
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

-- Tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- Junction table for many-to-many relation between entries and tags
create table if not exists public.entry_tags (
  entry_id uuid references public.entries(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (entry_id, tag_id)
);

-- Indexes
create index if not exists idx_entries_created_at_desc
  on public.entries (created_at desc);

create index if not exists idx_tags_name
  on public.tags (name);

create index if not exists idx_entry_tags_entry_id
  on public.entry_tags (entry_id);

create index if not exists idx_entry_tags_tag_id
  on public.entry_tags (tag_id);
```

3. Click **Run**.

**Validation**

- Open **Table Editor** and confirm:
  - `entries` table exists with columns `id`, `content`, `created_at`.
  - `tags` table exists with columns `id`, `name`.
  - `entry_tags` table exists with `entry_id`, `tag_id` and foreign keys.
- Optionally, run a quick test insert in the SQL Editor:

```sql
insert into entries (content) values ('Hello from StocksAI test');
select * from entries order by created_at desc limit 1;
```

You should see at least one row returned.

### 2.3. Get Supabase URL and Service Key

The backend uses Supabase’s URL and **service role key**.

1. In your Supabase project, go to **Project Settings → API**.
2. Under **Project URL**, copy the value named **URL** (it looks like `https://xxxxx.supabase.co`).
3. Under **Project API keys**, find:
   - **service_role** key (Service key). Click **Copy**.

> **Security note**: The `service_role` key is **secret**; it must never be exposed to the frontend or committed to Git. It is safe in the backend `.env` only.

**Validation**

- Ensure you have these values available:
  - `SUPABASE_URL` → your Supabase project URL.
  - `SUPABASE_SERVICE_KEY` → the service role key.

---

## 3. Backend Setup (FastAPI)

The backend lives in the `backend/` directory.

### 3.1. Create backend environment file

From the project root:

```bash
cd backend
```

Create a file named `.env` inside `backend/` with the following contents:

Replace the values with the ones from Supabase.

**Validation**

- Re‑open `.env` and confirm there are no extra spaces or missing quotes.
- Make sure `.env` is **not** committed to Git if you later initialize Git in `backend/`.

### 3.2. Install backend dependencies

From inside `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Validation**

- Run:

```bash
python -c "import fastapi, supabase"
```

If this command exits without errors, required libraries are installed.

### 3.3. Start the FastAPI server

Still inside `backend/` with the virtual environment activated:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

This will start the API at `http://localhost:8000`.

**Validation**

1. Open your browser at:
   - `http://localhost:8000/docs`
2. You should see the FastAPI Swagger UI with:
   - `POST /entries`
   - `GET /entries`
   - `PUT /entries/{entry_id}/tags`
   - `GET /tags`
3. Test an endpoint from Swagger UI:
   - Click `POST /entries` → **Try it out**.
   - Use this JSON:

```json
{
  "content": "Test entry from Swagger",
  "tags": ["test", "swagger"]
}
```

   - Click **Execute**.
4. You should see a `201` status code and a JSON response containing:
   - `id`
   - `content`
   - `created_at`
   - `tags`
5. In the Supabase **Table Editor**, check:
   - `entries` table has a new row with `content = "Test entry from Swagger"`.
   - `tags` table has `test` and `swagger`.
   - `entry_tags` has links between that entry and the two tags.

If all of the above works, your backend + database are correctly configured.

---

## 4. Frontend Setup (Next.js)

The frontend lives in the `frontend/` directory.

### 4.1. Configure frontend environment

From the project root:

```bash
cd frontend
```

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

**Validation**

- Confirm that `NEXT_PUBLIC_API_URL` matches the actual URL where your backend is running.
- Confirm `.env.local` is **not** committed to Git.

### 4.2. Install frontend dependencies

From inside `frontend/`:

```bash
npm install
```

**Validation**

- After `npm install` completes:
  - You should see a `node_modules/` directory.
  - Run:

```bash
npm run lint
```

  - The linter should complete without fatal errors (some warnings are fine).

### 4.3. Run the Next.js development server

Still inside `frontend/`:

```bash
npm run dev
```

This starts the frontend on `http://localhost:3000` by default.

**Validation**

1. Open your browser at `http://localhost:3000`.
2. You should see the StocksAI single-page interface (entry form, search, results).
3. Open the browser dev tools (**Network** tab) and confirm:
   - When the page loads or you interact with forms, you see XHR/fetch calls to `http://localhost:8000/...`.
   - These requests return status `200` / `201` rather than CORS or network errors.

If the API requests fail with CORS issues, confirm:

- The backend is running.
- `FRONTEND_ORIGIN` in `backend/.env` is set to `http://localhost:3000`.
- You restarted `uvicorn` after changing `.env`.

---

## 5. End‑to‑End Validation Scenarios

Once both servers are running:

- **Backend**: `http://localhost:8000` (`uvicorn app.main:app --reload`)
- **Frontend**: `http://localhost:3000` (`npm run dev`)

Use the following tests to verify full functionality.

### 5.1. Create a new entry from the UI

1. Go to `http://localhost:3000`.
2. In the **EntryForm** section:
   - Type some text into the content field, e.g. `Market update: tech stocks rally`.
   - In the tag input, type `finance` and press `Enter`.
   - Type `technology` and press `Enter`.
3. Click the **Submit** / **Save** button.

**Expected**

- The form clears (or at least disables while submitting).
- The **ResultsTable** updates to show a new row with:
  - `Content`: your text.
  - `Tags`: `finance`, `technology` as chips.
  - `Created At`: a recent timestamp.

**Backend/DB validation**

- In Supabase:
  - `entries` has a new row with that content.
  - `tags` includes `finance` and `technology` (if they weren’t there already).
  - `entry_tags` has two rows linking the entry to those tags.

### 5.2. Search and filter entries

1. In the **SearchBar**:
   - Enter `market` in the search input.
   - Choose `finance` from the tag dropdown/filter.
   - Select `created_at` sorted in `desc` order.
   - Click **Search** (or similar).

**Expected**

- The **ResultsTable** only shows entries whose content includes `market` and which are tagged `finance`, sorted by newest first.

Backend validation:

- In your browser dev tools (Network tab), inspect the request to `/entries?search=...&tag=...`.
- Confirm the query params match your input and the response contains the expected filtered rows.

### 5.3. Pagination

1. Create more than 20 entries (you can do this quickly via the UI with short content).
2. Use the pagination controls in the **ResultsTable** (Next/Previous page or page numbers).

**Expected**

- Only `limit` entries are shown per page (default 20).
- Navigating pages updates the `offset` parameter in the `/entries` API calls.

### 5.4. Inline tag editing

1. In the **ResultsTable**, find an existing entry.
2. Use the inline tag editing controls (e.g., click an “Edit tags” button or similar).
3. Add a new tag, e.g. `macro`, and remove an existing one if desired.
4. Save the tag changes.

**Expected**

- Immediately after saving:
  - The entry’s tags in the table update to reflect your changes.
  - The frontend sends a `PUT /entries/{id}/tags` request with the new `tags` array.

**Backend/DB validation**

- In Supabase:
  - `entry_tags` rows for that entry should match exactly the tags you saved.
  - The `tags` table should contain any new tag names you introduced.

### 5.5. Tag autocomplete

1. Focus the tag input (in the entry form or inline editing).
2. Start typing the name of an existing tag, e.g. `fin`.

**Expected**

- A dropdown list of suggestions appears, populated via `GET /tags?search=fin`.
- Selecting a suggestion adds that tag as a chip.
- Repeated typing should not spam the backend (requests are debounced).

Validation:

- In browser dev tools → Network, confirm:
  - Requests to `/tags?search=...` are sent as you type.
  - The results contain JSON with `items`, each with `name` and `usage_count`.
  - Usage counts roughly reflect how often tags are used in `entry_tags`.

---

## 6. Troubleshooting Checklist

- **Backend fails to start / crashes on Supabase client creation**
  - Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`.
  - Ensure the `pgcrypto` extension is enabled and tables are created.
- **CORS errors from frontend**
  - Make sure `FRONTEND_ORIGIN` in `backend/.env` is `http://localhost:3000`.
  - Restart `uvicorn` after changing `.env`.
- **Frontend can’t reach API**
  - Confirm backend is running at `http://localhost:8000`.
  - Confirm `NEXT_PUBLIC_API_URL` in `frontend/.env.local` is set correctly.
- **Tag autocomplete not working**
  - Check the Network tab for `/tags` requests and any error responses.
  - Validate the `tags` and `entry_tags` tables in Supabase contain data.

If all validation steps in sections 3–5 succeed, your local deployment is fully operational. 🎉

