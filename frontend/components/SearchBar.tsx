"use client";

import React, { useMemo } from "react";
import type { Tag, TaskStatus } from "@/lib/api";
import { DarkSelect } from "./DarkSelect";

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  statusFilter: "" | TaskStatus;
  onStatusFilterChange: (value: "" | TaskStatus) => void;
  tagsForFilter: Tag[];
  /** Called when "Clear filters" is clicked; clears status and tag filters. */
  onClearFilters?: () => void;
  /** When true, render only the filter row(s) with no title and no outer section. */
  embedded?: boolean;
}

const STATUS_OPTIONS: { value: "" | TaskStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  statusFilter,
  onStatusFilterChange,
  tagsForFilter,
  onClearFilters,
  embedded = false,
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

  const content = (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search content..."
        className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
      />
      <DarkSelect
        value={statusFilter}
        onChange={(v) => onStatusFilterChange(v as "" | TaskStatus)}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
        aria-label="Filter by status"
      />
      <DarkSelect
        value={tagFilter}
        onChange={onTagFilterChange}
        options={tagOptions}
        placeholder="All tags"
        aria-label="Filter by tag"
      />
      {onClearFilters != null && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  if (embedded) {
    return <div className="space-y-2">{content}</div>;
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Search &amp; Filter
        </h2>
      </div>
      {content}
    </section>
  );
};

