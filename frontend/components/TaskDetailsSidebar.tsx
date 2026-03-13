"use client";

import React from "react";
import type { Entry } from "@/lib/api";
import { TagChip } from "./TagChip";

const CLOCK_ICON = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const TAG_ICON = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const LIST_ICON = (
  <svg className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const MENU_ICON = (
  <svg className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} at ${time}`;
  } catch {
    return iso;
  }
}

function formatStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TaskDetailsSidebarProps {
  entry: Entry | null;
  onClose: () => void;
  onEdit?: (entry: Entry) => void;
}

export function TaskDetailsSidebar({ entry, onClose, onEdit }: TaskDetailsSidebarProps) {
  if (!entry) return null;

  const wordCount = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
  const charCount = entry.content.length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {MENU_ICON}
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Task Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            {CLOCK_ICON}
            <div>
              <p className="font-medium text-slate-500 dark:text-slate-400">Created</p>
              <p className="text-slate-900 dark:text-slate-100">{formatDateTime(entry.created_at)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {LIST_ICON}
            <div>
              <p className="font-medium text-slate-500 dark:text-slate-400">Status</p>
              <p className="capitalize text-slate-900 dark:text-slate-100">{formatStatus(entry.task_status)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {LIST_ICON}
            <div>
              <p className="font-medium text-slate-500 dark:text-slate-400">Priority</p>
              <p className="capitalize text-slate-900 dark:text-slate-100">{entry.priority}</p>
            </div>
          </div>
          {entry.due_date && (
            <div className="flex items-start gap-3">
              {CLOCK_ICON}
              <div>
                <p className="font-medium text-slate-500 dark:text-slate-400">Due date</p>
                <p className="text-slate-900 dark:text-slate-100">
                  {new Date(entry.due_date + "T12:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            {LIST_ICON}
            <div>
              <p className="font-medium text-slate-500 dark:text-slate-400">Words</p>
              <p className="text-slate-900 dark:text-slate-100">{wordCount}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {LIST_ICON}
            <div>
              <p className="font-medium text-slate-500 dark:text-slate-400">Characters</p>
              <p className="text-slate-900 dark:text-slate-100">{charCount}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {TAG_ICON}
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">Tags</p>
              <div className="flex flex-wrap gap-1">
                {entry.tags.length === 0 ? (
                  <span className="text-slate-500 dark:text-slate-400">—</span>
                ) : (
                  entry.tags.map((t) => <TagChip key={t} label={t} />)
                )}
              </div>
            </div>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Edit task
          </button>
        )}
      </div>
    </aside>
  );
}
