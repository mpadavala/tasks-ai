"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Entry, SortBy, SortOrder } from "@/lib/api";
import { TagChip } from "./TagChip";
import { TagInput } from "./TagInput";

interface ResultsTableProps {
  entries: Entry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: SortBy;
  order: SortOrder;
  onSortChange: (sortBy: SortBy, order: SortOrder) => void;
  onUpdateEntryTags: (entryId: string, tags: string[]) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  loading: boolean;
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
  onUpdateEntryTags,
  onDeleteEntry,
  loading,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const editingTagsRef = useRef<string[]>([]);
  editingTagsRef.current = editingTags;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const startIndex = page * pageSize + 1;
  const endIndex = Math.min(total, (page + 1) * pageSize);

  const beginEdit = (entry: Entry) => {
    setEditingId(entry.id);
    setEditingTags(entry.tags);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTags([]);
    setError(null);
  };

  const saveEdit = async () => {
    const entryId = editingId;
    if (!entryId) return;
    const tagsToSave = editingTagsRef.current;
    setSavingId(entryId);
    setError(null);
    try {
      await onUpdateEntryTags(entryId, tagsToSave);
      setEditingId(null);
      setEditingTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tags");
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

  const openDeleteConfirm = (entryId: string) => {
    setError(null);
    setDeleteConfirmId(entryId);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmId(null);
  };

  const confirmDelete = async () => {
    const entryId = deleteConfirmId;
    if (!entryId) return;
    setDeleteConfirmId(null);
    setDeletingId(entryId);
    setError(null);
    if (editingId === entryId) {
      setEditingId(null);
      setEditingTags([]);
    }
    try {
      await onDeleteEntry(entryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  };

  const entryToDelete = deleteConfirmId
    ? entries.find((e) => e.id === deleteConfirmId)
    : null;
  const deleteTitle = entryToDelete?.content
    ? `Delete "${entryToDelete.content.length > 60 ? `${entryToDelete.content.slice(0, 60)}…` : entryToDelete.content}"?`
    : "Delete task?";

  const deleteModal =
    mounted &&
    deleteConfirmId &&
    createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div
          className="absolute inset-0 bg-transparent"
          aria-hidden
          onClick={closeDeleteConfirm}
        />
        <div
          className="relative z-10 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="delete-dialog-title"
            className="text-sm font-semibold text-slate-100"
          >
            {deleteTitle}
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteConfirm}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {deleteModal}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Tasks
        </h2>
        <p className="text-xs text-slate-400">
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
        <table className="min-w-full text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
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
                onClick={() => toggleSort("created_at")}
              >
                Created At{" "}
                {sortBy === "created_at" && (order === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-2 py-2 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-8 text-center text-xs text-slate-500"
                >
                  {loading ? "Loading..." : "No tasks match your filters."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isEditing = editingId === entry.id;
                const isDeleting = deleteConfirmId === entry.id;
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-800/70 align-top last:border-0 ${isDeleting ? "bg-red-950/50 ring-2 ring-inset ring-red-500/80" : ""}`}
                  >
                    <td className="max-w-xl px-2 py-2 text-sm text-slate-100">
                      {entry.content}
                    </td>
                    <td className="px-2 py-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <TagInput
                            value={editingTags}
                            onChange={setEditingTags}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void saveEdit();
                              }}
                              disabled={savingId === entry.id}
                              className="rounded-md bg-sky-500 px-2 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
                            >
                              {savingId === entry.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              disabled={savingId === entry.id}
                              className="rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.tags.length === 0 ? (
                            <span className="text-xs text-slate-500">
                              No tags
                            </span>
                          ) : (
                            entry.tags.map((t) => (
                              <TagChip key={t} label={t} />
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => beginEdit(entry)}
                            className="ml-1 rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-800"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteConfirm(entry.id);
                        }}
                        disabled={deletingId === entry.id}
                        className="rounded-md border border-red-800/80 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === entry.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(pageCount - 1, page + 1))
              }
              disabled={page >= pageCount - 1 || loading}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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

