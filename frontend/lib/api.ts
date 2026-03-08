export type SortBy = "content" | "created_at" | "tags";
export type SortOrder = "asc" | "desc";

export type Priority = "high" | "medium" | "low";

export interface Entry {
  id: string;
  content: string;
  priority: Priority;
  created_at: string;
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

export async function createEntry(input: {
  content: string;
  priority?: Priority;
  tags: string[];
}): Promise<Entry> {
  const tags = (input.tags || [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const priority = input.priority ?? "medium";
  const res = await fetch(`${API_URL}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: input.content, priority, tags }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to create entry");
  }

  return res.json();
}

export interface FetchEntriesOptions {
  search?: string;
  tag?: string;
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
    throw new Error(body.detail ?? "Failed to fetch entries");
  }

  return res.json();
}

export async function deleteEntry(entryId: string): Promise<void> {
  const res = await fetch(`${API_URL}/entries/${entryId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Failed to delete entry");
  }
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
    throw new Error(body.detail ?? "Failed to update entry tags");
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
    throw new Error(body.detail ?? "Failed to fetch tags");
  }

  return res.json();
}

