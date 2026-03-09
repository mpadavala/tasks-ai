export type SortBy = "content" | "created_at" | "tags" | "priority" | "due_date";
export type SortOrder = "asc" | "desc";

export type Priority = "high" | "medium" | "low";

export type TaskStatus = "not_started" | "in_progress" | "done";

export type StatusFilter = "active" | "completed";
export type DueFilter = "all" | "today" | "week" | "month" | "overdue";

export interface Entry {
  id: string;
  content: string;
  priority: Priority;
  created_at: string;
  due_date: string | null;
  deleted_at: string | null;
  task_status: TaskStatus;
  parent_id: string | null;
  tags: string[];
}

export interface EntryListResponse {
  items: Entry[];
  total: number;
}

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
}

export interface TagListResponse {
  items: Tag[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

function errorMessage(detail: unknown, fallback: string): string {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
  if (typeof detail === "object" && "message" in detail && typeof (detail as { message: string }).message === "string") return (detail as { message: string }).message;
  return fallback;
}

export async function createEntry(input: {
  content: string;
  priority?: Priority;
  tags: string[];
  due_date?: string | null;
  parent_id?: string | null;
}): Promise<Entry> {
  const tags = (input.tags || [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const priority = input.priority ?? "medium";
  const body: Record<string, unknown> = { content: input.content, priority, tags };
  if (input.due_date !== undefined && input.due_date !== "") body.due_date = input.due_date;
  if (input.parent_id !== undefined && input.parent_id !== "") body.parent_id = input.parent_id;
  const res = await fetch(`${API_URL}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to create entry"));
  }

  return res.json();
}

export interface FetchEntriesOptions {
  search?: string;
  tag?: string;
  status?: StatusFilter;
  task_status?: TaskStatus | "";
  due_filter?: DueFilter;
  from_date?: string;
  to_date?: string;
  parent_id?: string | null;
  sort_by?: SortBy;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export async function fetchEntries(options: FetchEntriesOptions): Promise<EntryListResponse> {
  const query = buildQuery(options);
  const res = await fetch(`${API_URL}/entries${query}`, {
    method: "GET",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to fetch entries"));
  }

  return res.json();
}

export async function deleteEntry(entryId: string): Promise<void> {
  const res = await fetch(`${API_URL}/entries/${entryId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to delete entry"));
  }
}

export async function restoreEntry(entryId: string): Promise<Entry> {
  const res = await fetch(`${API_URL}/entries/${entryId}/restore`, {
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to restore entry"));
  }

  return res.json();
}

export async function updateEntry(
  entryId: string,
  payload: { content: string; priority: Priority; tags: string[]; due_date?: string | null; parent_id?: string | null }
): Promise<Entry> {
  const tags = (payload.tags || [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const body: Record<string, unknown> = {
    content: payload.content,
    priority: payload.priority ?? "medium",
    tags,
  };
  if (payload.due_date !== undefined) body.due_date = payload.due_date || null;
  if (payload.parent_id !== undefined) body.parent_id = payload.parent_id ?? null;
  const res = await fetch(`${API_URL}/entries/${entryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to update entry"));
  }

  return res.json();
}

export async function updateEntryStatus(entryId: string, taskStatus: TaskStatus): Promise<Entry> {
  const res = await fetch(`${API_URL}/entries/${entryId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task_status: taskStatus }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to update status"));
  }

  return res.json();
}

export async function updateEntryTags(entryId: string, tags: string[]): Promise<Entry> {
  const normalized = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const res = await fetch(`${API_URL}/entries/${entryId}/tags`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tags: normalized }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to update entry tags"));
  }

  return res.json();
}

export async function fetchTags(search?: string): Promise<TagListResponse> {
  const query = buildQuery({ search });
  const res = await fetch(`${API_URL}/tags${query}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(errorMessage(body.detail, "Failed to fetch tags"));
  }

  return res.json();
}

