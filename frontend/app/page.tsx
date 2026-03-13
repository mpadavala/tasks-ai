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
  createEntry,
  fetchEntries,
  fetchTags,
  updateEntry,
  updateEntryStatus,
} from "@/lib/api";
import { CalendarView } from "@/components/CalendarView";
import { EntryForm } from "@/components/EntryForm";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ResultsTable } from "@/components/ResultsTable";
import { TaskDetailsSidebar } from "@/components/TaskDetailsSidebar";
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
  const [tagSearch, setTagSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "not_started" | "in_progress" | "done">("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [order, setOrder] = useState<SortOrder>("desc");

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
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
        task_status: statusFilter || undefined,
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

  useEffect(() => {
    if (activeTab === "calendar") return;
    const t = setTimeout(() => {
      void loadEntries({ page: 0 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tagFilter, statusFilter]);

  const handleTabChange = (tab: TabId) => {
    if (tab === "calendar") {
      setActiveTab("calendar");
    } else {
      void loadEntries({
        page: 0,
        tab,
        ...getDefaultSortForTab(tab),
      });
    }
  };

  const handleCreated = (entry: Entry) => {
    setShowNewTaskModal(false);
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
    payload: {
      content: string;
      priority: "high" | "medium" | "low";
      tags: string[];
      due_date?: string | null;
      parent_id?: string | null;
    }
  ) => {
    const updated = await updateEntry(entryId, payload);
    setEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e)),
    );
    if (selectedEntry?.id === updated.id) setSelectedEntry(updated);
    void loadEntries({ page: 0 });
    void refreshTagsForFilter();
    return updated;
  };

  const handleFetchSubtasks = async (parentId: string): Promise<Entry[]> => {
    const res = await fetchEntries({
      status: TAB_STATUS[activeTab],
      due_filter: TAB_DUE_FILTER[activeTab],
      parent_id: parentId,
      sort_by: sortBy,
      order,
      limit: 100,
      offset: 0,
    });
    return res.items;
  };

  const handleCreateSubtask = async (
    parentId: string,
    data: { content: string; priority?: "high" | "medium" | "low"; tags: string[]; due_date?: string | null }
  ): Promise<Entry> => {
    const entry = await createEntry({
      content: data.content,
      priority: data.priority ?? "medium",
      tags: data.tags ?? [],
      due_date: data.due_date ?? null,
      parent_id: parentId,
    });
    void loadEntries({ page: 0 });
    void refreshTagsForFilter();
    return entry;
  };

  const handleUpdateStatus = async (entryId: string, taskStatus: "not_started" | "in_progress" | "done") => {
    await updateEntryStatus(entryId, taskStatus);
    if (selectedEntry?.id === entryId) {
      setSelectedEntry((prev) => (prev ? { ...prev, task_status: taskStatus } : null));
    }
    void loadEntries({ page: 0 });
    void refreshTagsForFilter();
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tags={availableTags}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        tagSearch={tagSearch}
        onTagSearchChange={setTagSearch}
        onThemeToggle={toggleTheme}
        theme={theme}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="min-w-0">
            {error && (
              <p className="truncate text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowNewTaskModal(true)}
            className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600"
          >
            New task
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
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
              onFetchSubtasks={handleFetchSubtasks}
              onCreateSubtask={handleCreateSubtask}
              loading={loading}
              isCompletedTab={activeTab === "completed"}
              search={search}
              onSearchChange={setSearch}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              tagsForFilter={availableTags}
              onClearFilters={() => {
                setStatusFilter("");
                setTagFilter("");
              }}
              selectedEntryId={selectedEntry?.id ?? null}
              onSelectEntry={setSelectedEntry}
              openEditEntryId={editEntryId}
              openEditEntry={editEntryId && selectedEntry?.id === editEntryId ? selectedEntry : null}
              onEditModalClose={() => setEditEntryId(null)}
            />
          )}
        </div>
      </main>

      {selectedEntry && (
        <TaskDetailsSidebar
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={(entry) => setEditEntryId(entry.id)}
        />
      )}

      {showNewTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-task-modal-title"
          onClick={() => setShowNewTaskModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-300 bg-slate-100 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowNewTaskModal(false)}
              className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <div className="p-4 pt-10">
              <EntryForm onCreated={handleCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
