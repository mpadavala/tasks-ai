"use client";

import React, { useMemo } from "react";
import type { Tag } from "@/lib/api";
import { DarkSelect } from "./DarkSelect";

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  tagsForFilter: Tag[];
  /** When true, render only the filter row(s) with no title and no outer section. */
  embedded?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  tagFilter,
  onTagFilterChange,
  tagsForFilter,
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
        value={tagFilter}
        onChange={onTagFilterChange}
        options={tagOptions}
        placeholder="All tags"
        aria-label="Filter by tag"
      />
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

