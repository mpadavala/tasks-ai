"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Entry, type Priority, type TaskStatus, SortBy, SortOrder } from "@/lib/api";
import { DatePickerInput } from "./DatePickerInput";
import { TagChip } from "./TagChip";
import { TagInput } from "./TagInput";
import { PriorityInput } from "./PriorityInput";

interface ResultsTableProps {
  entries: Entry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: SortBy;
  order: SortOrder;
  onSortChange: (sortBy: SortBy, order: SortOrder) => void;
  onUpdateEntry: (entryId: string, payload: { content: string; priority: Priority; tags: string[]; due_date?: string | null }) => Promise<Entry>;
  onUpdateStatus: (entryId: string, taskStatus: TaskStatus) => Promise<void>;
  loading: boolean;
  isCompletedTab?: boolean;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  entries,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  order,
  onSortChange,
  onUpdateEntry,
  onUpdateStatus,
  loading,
  isCompletedTab = false,
}) => {
  const [editModalEntry, setEditModalEntry] = useState<Entry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: "not_started", label: "Not Started" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" },
  ];

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const startIndex = page * pageSize + 1;
  const endIndex = Math.min(total, (page + 1) * pageSize);

  const openEditModal = (entry: Entry) => {
    setEditModalEntry(entry);
    setEditContent(entry.content);
    setEditPriority((entry.priority as Priority) ?? "medium");
    setEditDueDate(entry.due_date ?? "");
    setEditTags(entry.tags);
    setError(null);
  };

  const closeEditModal = () => {
    setEditModalEntry(null);
    setError(null);
  };

  const isEditDirty =
    editModalEntry &&
    (editContent !== editModalEntry.content ||
      editPriority !== (editModalEntry.priority ?? "medium") ||
      (editDueDate || null) !== (editModalEntry.due_date ?? null) ||
      JSON.stringify([...editTags].sort()) !== JSON.stringify([...editModalEntry.tags].sort()));

  const saveEdit = async () => {
    if (!editModalEntry || !isEditDirty) return;
    setSavingId(editModalEntry.id);
    setError(null);
    try {
      await onUpdateEntry(editModalEntry.id, {
        content: editContent.trim(),
        priority: editPriority,
        tags: editTags,
        due_date: editDueDate.trim() || null,
      });
      closeEditModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSavingId(null);
    }
  };

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      onSortChange(column, order === "asc" ? "desc" : "asc");
    } else {
      onSortChange(column, "desc");
    }
  };

  const handleStatusChange = async (entryId: string, taskStatus: TaskStatus) => {
    setUpdatingStatusId(entryId);
    setError(null);
    if (editModalEntry?.id === entryId) {
      closeEditModal();
    }
    try {
      await onUpdateStatus(entryId, taskStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const editModal =
    mounted &&
    editModalEntry &&
    createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
      >
        <div
          className="absolute inset-0 bg-transparent"
          aria-hidden
          onClick={closeEditModal}
        />
        <div
          className="relative z-10 w-full max-w-lg rounded-xl border border-slate-300 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="edit-dialog-title"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Edit task
          </h3>
          {error && (
            <p className="mt-2 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
          {isEditDirty && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              You have unsaved changes.
            </p>
          )}
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Content</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mt-1 min-h-[80px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Priority</label>
              <div className="mt-1">
                <PriorityInput value={editPriority} onChange={setEditPriority} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</label>
              <div className="mt-1">
                <DatePickerInput
                  value={editDueDate}
                  onChange={setEditDueDate}
                  aria-label="Due date"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tags</label>
              <div className="mt-1">
                <TagInput value={editTags} onChange={setEditTags} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-md border border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={!isEditDirty || savingId === editModalEntry.id || !editContent.trim()}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingId === editModalEntry.id ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {editModal}
      <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Tasks
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {total === 0
            ? "No tasks yet"
            : `Showing ${startIndex}-${endIndex} of ${total}`}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-900 dark:text-slate-100">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th
                className="px-2 py-2 cursor-pointer select-none"
                onClick={() => toggleSort("content")}
              >
                Content {sortBy === "content" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 cursor-pointer select-none"
                onClick={() => toggleSort("tags")}
              >
                Tags {sortBy === "tags" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 cursor-pointer select-none"
                onClick={() => toggleSort("priority")}
              >
                Priority{" "}
                {sortBy === "priority" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 cursor-pointer select-none"
                onClick={() => toggleSort("due_date")}
              >
                Due date{" "}
                {sortBy === "due_date" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-2 py-2 cursor-pointer select-none"
                onClick={() => toggleSort("created_at")}
              >
                Created At{" "}
                {sortBy === "created_at" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-2 py-2 w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-2 py-8 text-center text-xs text-slate-500 dark:text-slate-500"
                >
                  {loading ? "Loading..." : "No tasks match your filters."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue =
                  !isCompletedTab &&
                  !!entry.due_date &&
                  entry.due_date < today;
                const currentStatus = (entry.task_status ?? "not_started") as TaskStatus;
                return (
                  <tr
                    key={entry.id}
                    onDoubleClick={() => openEditModal(entry)}
                    className="cursor-pointer border-b border-slate-200 align-top last:border-0 hover:bg-slate-100 dark:border-slate-800/70 dark:hover:bg-slate-800/30"
                  >
                    <td className={`max-w-xl px-2 py-2 text-sm ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-900 dark:text-slate-100"}`}>
                      {entry.content}
                    </td>
                    <td className={`px-2 py-2 ${isOverdue ? "text-orange-600 dark:text-orange-200" : ""}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.tags.length === 0 ? (
                          <span className={`text-xs ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-500"}`}>
                            No tags
                          </span>
                        ) : (
                          entry.tags.map((t) => (
                            <TagChip key={t} label={t} className={isOverdue ? "!text-orange-600 dark:!text-orange-200" : undefined} />
                          ))
                        )}
                      </div>
                    </td>
                    <td className={`whitespace-nowrap px-2 py-2 text-xs capitalize ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-600 dark:text-slate-300"}`}>
                      {entry.priority ?? "medium"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2 py-2 text-xs ${isOverdue ? "text-orange-600 font-medium dark:text-orange-200" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {entry.due_date ? new Date(entry.due_date + "T12:00:00").toLocaleDateString() : "—"}
                      {isOverdue && entry.due_date ? (
                        <span className="ml-1 text-[10px] text-orange-500 dark:text-orange-300/90">
                          (overdue)
                        </span>
                      ) : null}
                    </td>
                    <td className={`whitespace-nowrap px-2 py-2 text-xs ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-500 dark:text-slate-400"}`}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={currentStatus}
                        onChange={(e) => {
                          const v = e.target.value as TaskStatus;
                          void handleStatusChange(entry.id, v);
                        }}
                        disabled={updatingStatusId === entry.id}
                        className="w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        aria-label="Task status"
                      >
                        {TASK_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-slate-400 px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(pageCount - 1, page + 1))
              }
              disabled={page >= pageCount - 1 || loading}
              className="rounded-md border border-slate-400 px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
    </>
  );
};

