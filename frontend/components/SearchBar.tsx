"use client";

import React, { useMemo } from "react";
import type { SortBy, SortOrder, Tag } from "@/lib/api";
import { DarkSelect } from "./DarkSelect";

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  sortBy: SortBy;
  order: SortOrder;
  onSortByChange: (value: SortBy) => void;
  onOrderChange: (value: SortOrder) => void;
  tagsForFilter: Tag[];
  onSubmitSearch: () => void;
  onFetchAll: () => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "created_at", label: "Created At" },
  { value: "content", label: "Content" },
  { value: "tags", label: "Tags" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due Date" },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  sortBy,
  order,
  onSortByChange,
  onOrderChange,
  tagsForFilter,
  onSubmitSearch,
  onFetchAll,
}) => {
  const tagOptions = useMemo(
    () => [
      { value: "", label: "All tags" },
      ...[...tagsForFilter]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((t) => ({ value: t.name, label: t.name })),
    ],
    [tagsForFilter]
  );

  return (
    <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Search &amp; Filter
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search content..."
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
        />
        <DarkSelect
          value={tagFilter}
          onChange={onTagFilterChange}
          options={tagOptions}
          placeholder="All tags"
          aria-label="Filter by tag"
        />
        <DarkSelect
          value={sortBy}
          onChange={(v) => onSortByChange(v as SortBy)}
          options={SORT_OPTIONS}
          aria-label="Sort by"
        />
        <DarkSelect
          value={order}
          onChange={(v) => onOrderChange(v as SortOrder)}
          options={ORDER_OPTIONS}
          aria-label="Order"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onFetchAll}
          className="inline-flex items-center rounded-md border border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Fetch All
        </button>
        <button
          type="button"
          onClick={onSubmitSearch}
          className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white! shadow-sm transition hover:bg-sky-500"
        >
          Search
        </button>
      </div>
    </section>
  );
};

