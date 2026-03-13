"use client";

import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { Tag } from "@/lib/api";
import type { TabId } from "@/app/page";

const NAV_ICON = (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const CALENDAR_ICON = (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const TAG_ICON = (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const SEARCH_ICON = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const CHEVRON_RIGHT = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
  { id: "calendar", label: "Calendar" },
];

interface LeftSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tags: Tag[];
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  tagSearch: string;
  onTagSearchChange: (value: string) => void;
  onThemeToggle: () => void;
  theme: "light" | "dark";
}

export function LeftSidebar({
  activeTab,
  onTabChange,
  tags,
  tagFilter,
  onTagFilterChange,
  tagSearch,
  onTagSearchChange,
  onThemeToggle,
  theme,
}: LeftSidebarProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex flex-col gap-6 p-4">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onTabChange("all");
          }}
          className="text-lg font-semibold text-slate-900 dark:text-slate-50"
        >
          TasksAI
        </a>

        <nav className="space-y-0.5" aria-label="Main">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition dark:text-slate-200"
          >
            {NAV_ICON}
            <span>Tasks</span>
          </button>
        </nav>

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            View
          </p>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                activeTab === id
                  ? "bg-sky-100 font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50"
              }`}
            >
              {id === "calendar" ? CALENDAR_ICON : null}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            {CALENDAR_ICON}
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Calendar
            </span>
          </div>
          <div className="rdp-dark rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
            <DayPicker
              mode="single"
              selected={undefined}
              onSelect={() => {}}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              weekStartsOn={1}
              className="rdp-root w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            {TAG_ICON}
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tags
            </span>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
              {SEARCH_ICON}
            </span>
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              placeholder="Search tags..."
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <ul className="space-y-0.5">
            {tags
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
              .filter((tag) => !tagSearch.trim() || tag.name.toLowerCase().includes(tagSearch.trim().toLowerCase()))
              .map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onClick={() => onTagFilterChange(tagFilter === tag.name ? "" : tag.name)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      tagFilter === tag.name
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="truncate">#{tag.name}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {tag.usage_count}
                      </span>
                      {CHEVRON_RIGHT}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onThemeToggle}
            className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </aside>
  );
}
