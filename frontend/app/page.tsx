 "use client";

import React, { useEffect, useState } from "react";
import {
  Entry,
  EntryListResponse,
  type DueFilter,
  type StatusFilter,
  SortBy,
  SortOrder,
  Tag,
  fetchEntries,
  fetchTags,
  updateEntry,
  updateEntryStatus,
} from "@/lib/api";
import { CalendarView } from "@/components/CalendarView";
import { EntryForm } from "@/components/EntryForm";
import { SearchBar } from "@/components/SearchBar";
import { ResultsTable } from "@/components/ResultsTable";
import { useTheme } from "@/components/ThemeProvider";

const PAGE_SIZE = 20;

export type TabId = "today" | "week" | "month" | "all" | "overdue" | "completed" | "calendar";

const TAB_STATUS: Record<TabId, StatusFilter> = {
  today: "active",
  week: "active",
  month: "active",
  all: "active",
  overdue: "active",
  completed: "completed",
  calendar: "active",
};

const TAB_DUE_FILTER: Record<TabId, DueFilter> = {
  today: "today",
  week: "week",
  month: "month",
  all: "all",
  overdue: "overdue",
  completed: "all",
  calendar: "all",
};

function getDefaultSortForTab(tab: TabId): { sortBy: SortBy; order: SortOrder } {
  if (tab === "all" || tab === "calendar") return { sortBy: "created_at", order: "desc" };
  return { sortBy: "due_date", order: "asc" };
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [panelTab, setPanelTab] = useState<"new" | "search">("new");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const loadEntries = async (
    overrides?: Partial<{ page: number; sortBy: SortBy; order: SortOrder; tab: TabId }>
  ) => {
    const effectiveTab = overrides?.tab ?? activeTab;
    const effectivePage = overrides?.page ?? page;
    const effectiveSortBy = overrides?.sortBy ?? sortBy;
    const effectiveOrder = overrides?.order ?? order;
    setLoading(true);
    setError(null);
    try {
      const res: EntryListResponse = await fetchEntries({
        search: search || undefined,
        tag: tagFilter || undefined,
        status: TAB_STATUS[effectiveTab],
        due_filter: TAB_DUE_FILTER[effectiveTab],
        sort_by: effectiveSortBy,
        order: effectiveOrder,
        limit: PAGE_SIZE,
        offset: effectivePage * PAGE_SIZE,
      });
      setEntries(res.items);
      setTotal(res.total);
      setPage(effectivePage);
      if (overrides?.tab !== undefined) setActiveTab(overrides.tab);
      if (overrides?.sortBy !== undefined) setSortBy(overrides.sortBy);
      if (overrides?.order !== undefined) setOrder(overrides.order);
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
    if (activeTab !== "calendar") void loadEntries({ page: 0, tab: activeTab });
    void refreshTagsForFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = (entry: Entry) => {
    setEntries((prev) => [entry, ...prev]);
    setTotal((prev) => prev + 1);
    void loadEntries({
      page: 0,
      tab: activeTab,
      sortBy: "created_at",
      order: "desc",
    });
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

  const handleUpdateEntry = async (
    entryId: string,
    payload: { content: string; priority: "high" | "medium" | "low"; tags: string[]; due_date?: string | null }
  ) => {
    const updated = await updateEntry(entryId, payload);
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    void refreshTagsForFilter();
    return updated;
  };

  const handleUpdateStatus = async (entryId: string, taskStatus: "not_started" | "in_progress" | "done") => {
    await updateEntryStatus(entryId, taskStatus);
    void loadEntries({ page: 0 });
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
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            TasksAI
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Capture tagged tasks and explore them with powerful filtering.
          </p>
          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>

      <section className="space-y-4">
        <div className="flex gap-1 border-b border-slate-300 pb-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPanelTab("new")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              panelTab === "new"
                ? "bg-sky-600 text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            New Task
          </button>
          <button
            type="button"
            onClick={() => setPanelTab("search")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              panelTab === "search"
                ? "bg-sky-600 text-white"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            Search &amp; Filter
          </button>
        </div>
        {panelTab === "new" ? (
          <EntryForm onCreated={handleCreated} />
        ) : (
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
        )}
        <div className="flex flex-wrap gap-1 border-b border-slate-300 pb-2 dark:border-slate-800">
          {(
            [
              { id: "all" as TabId, label: "All" },
              { id: "today" as TabId, label: "Today" },
              { id: "week" as TabId, label: "This Week" },
              { id: "month" as TabId, label: "This Month" },
              { id: "overdue" as TabId, label: "Overdue" },
              { id: "completed" as TabId, label: "Completed" },
              { id: "calendar" as TabId, label: "Calendar" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "calendar") {
                  setActiveTab(id);
                } else {
                  void loadEntries({
                    page: 0,
                    tab: id,
                    ...getDefaultSortForTab(id),
                  });
                }
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                activeTab === id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "calendar" ? (
        <CalendarView
          search={search || undefined}
          tagFilter={tagFilter || undefined}
        />
      ) : (
        <ResultsTable
          entries={entries}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          sortBy={sortBy}
          order={order}
          onSortChange={handleSortChange}
          onUpdateEntry={handleUpdateEntry}
          onUpdateStatus={handleUpdateStatus}
          loading={loading}
          isCompletedTab={activeTab === "completed"}
        />
      )}
    </main>
  );
}

