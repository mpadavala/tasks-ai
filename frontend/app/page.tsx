 "use client";

import React, { useEffect, useState } from "react";
import {
  Entry,
  EntryListResponse,
  SortBy,
  SortOrder,
  Tag,
  deleteEntry,
  fetchEntries,
  fetchTags,
  updateEntryTags,
} from "@/lib/api";
import { EntryForm } from "@/components/EntryForm";
import { SearchBar } from "@/components/SearchBar";
import { ResultsTable } from "@/components/ResultsTable";

const PAGE_SIZE = 20;

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async (overrides?: Partial<{ page: number }>) => {
    const effectivePage = overrides?.page ?? page;
    setLoading(true);
    setError(null);
    try {
      const res: EntryListResponse = await fetchEntries({
        search: search || undefined,
        tag: tagFilter || undefined,
        sort_by: sortBy,
        order,
        limit: PAGE_SIZE,
        offset: effectivePage * PAGE_SIZE,
      });
      setEntries(res.items);
      setTotal(res.total);
      setPage(effectivePage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  const refreshTagsForFilter = async () => {
    try {
      const res = await fetchTags();
      setAvailableTags(res.items);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    void loadEntries({ page: 0 });
    void refreshTagsForFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = (entry: Entry) => {
    // Optimistically prepend new entry and refetch list for consistency
    setEntries((prev) => [entry, ...prev]);
    setTotal((prev) => prev + 1);
    void loadEntries({ page: 0 });
    void refreshTagsForFilter();
  };

  const handlePageChange = (nextPage: number) => {
    void loadEntries({ page: nextPage });
  };

  const handleSortChange = (nextSortBy: SortBy, nextOrder: SortOrder) => {
    setSortBy(nextSortBy);
    setOrder(nextOrder);
    void loadEntries({ page: 0 });
  };

  const handleUpdateEntryTags = async (entryId: string, tags: string[]) => {
    const updated = await updateEntryTags(entryId, tags);
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    void refreshTagsForFilter();
  };

  const handleDeleteEntry = async (entryId: string) => {
    await deleteEntry(entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setTotal((prev) => Math.max(0, prev - 1));
    void refreshTagsForFilter();
  };

  const handleSubmitSearch = () => {
    void loadEntries({ page: 0 });
  };

  const handleFetchAll = () => {
    setSearch("");
    setTagFilter("");
    void loadEntries({ page: 0 });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-50">
          TasksAI
        </h1>
        <p className="text-xs text-slate-400">
          Capture tagged tasks and explore them with powerful filtering.
        </p>
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)]">
        <div className="space-y-4">
          <EntryForm onCreated={handleCreated} />
        </div>
        <div className="space-y-4">
          <SearchBar
            search={search}
            onSearchChange={setSearch}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            sortBy={sortBy}
            order={order}
            onSortByChange={setSortBy}
            onOrderChange={setOrder}
            tagsForFilter={availableTags}
            onSubmitSearch={handleSubmitSearch}
            onFetchAll={handleFetchAll}
          />
        </div>
      </section>

      <ResultsTable
        entries={entries}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        onUpdateEntryTags={handleUpdateEntryTags}
        onDeleteEntry={handleDeleteEntry}
        loading={loading}
      />
    </main>
  );
}

