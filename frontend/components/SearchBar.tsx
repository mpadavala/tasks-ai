"use client";

import React from "react";
import type { SortBy, SortOrder, Tag } from "@/lib/api";

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
  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Search &amp; Filter
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search content..."
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <select
          value={tagFilter}
          onChange={(e) => onTagFilterChange(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-50 focus:border-sky-500 focus:outline-none"
        >
          <option value="">All tags</option>
          {[...tagsForFilter]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
            .map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-50 focus:border-sky-500 focus:outline-none"
        >
          <option value="created_at">Created At</option>
          <option value="content">Content</option>
        </select>
        <select
          value={order}
          onChange={(e) => onOrderChange(e.target.value as SortOrder)}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-50 focus:border-sky-500 focus:outline-none"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onFetchAll}
          className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          Fetch All
        </button>
        <button
          type="button"
          onClick={onSubmitSearch}
          className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white"
        >
          Search
        </button>
      </div>
    </section>
  );
};

