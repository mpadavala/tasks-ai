"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Entry, type Priority, type TaskStatus, SortBy, SortOrder } from "@/lib/api";
import type { Tag } from "@/lib/api";
import { DatePickerInput } from "./DatePickerInput";
import { TagChip } from "./TagChip";
import { TagInput } from "./TagInput";
import { PriorityInput } from "./PriorityInput";
import { SearchBar } from "./SearchBar";

const DND_TOP_LEVEL_ID = "dnd-top-level";

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/** Row that is both droppable and draggable; drag from anywhere on the row. */
function DraggableDroppableTr({
  id,
  className,
  children,
  ...rest
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLTableRowElement>) {
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({ id });
  const setRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      setDroppableRef(node);
      setDraggableRef(node);
    },
    [setDroppableRef, setDraggableRef]
  );
  const highlight = isOver ? "ring-2 ring-inset ring-sky-500 bg-sky-50/90 dark:bg-sky-900/40" : "";
  const dragOpacity = isDragging ? "opacity-60" : "";
  const combined = [className, highlight, dragOpacity, "transition-all duration-150 ease-out cursor-grab active:cursor-grabbing"].filter(Boolean).join(" ");
  return (
    <tr ref={setRef} className={combined} {...attributes} {...listeners} {...rest}>
      {children}
    </tr>
  );
}

function DroppableTr({
  id,
  className,
  children,
  component = "tr",
  ...rest
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
  component?: "tr" | "div";
} & React.HTMLAttributes<HTMLTableRowElement>) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const highlight = isOver ? "ring-2 ring-inset ring-sky-500 bg-sky-50/90 dark:bg-sky-900/40" : "";
  const combined = [className, highlight, "transition-all duration-150 ease-out"].filter(Boolean).join(" ");
  if (component === "div") {
    return (
      <div ref={setNodeRef} className={combined}>
        {children}
      </div>
    );
  }
  return (
    <tr ref={setNodeRef} className={combined} {...rest}>
      {children}
    </tr>
  );
}

function DragPreviewCard({ entry, isSubtask }: { entry: Entry; isSubtask?: boolean }) {
  const isOverdue = !!entry.due_date && entry.due_date < new Date().toISOString().slice(0, 10);
  return (
    <div
      className="flex min-w-[280px] max-w-[420px] items-center gap-2 rounded-xl border border-slate-200/90 bg-white py-2.5 pl-2.5 pr-3 shadow-xl ring-1 ring-slate-200/50 transition-shadow dark:border-slate-600 dark:bg-slate-800 dark:ring-slate-600/50"
      style={{ cursor: "grabbing" }}
    >
      <div className="flex shrink-0 text-slate-400 dark:text-slate-500">
        <GripIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isOverdue ? "text-orange-600 dark:text-orange-300" : "text-slate-800 dark:text-slate-100"}`}>
          {isSubtask && <span className="mr-1 text-slate-400">↳ </span>}
          {entry.content}
        </p>
        {entry.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                {t}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{entry.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultsTableProps {
  entries: Entry[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: SortBy;
  order: SortOrder;
  onSortChange: (sortBy: SortBy, order: SortOrder) => void;
  onUpdateEntry: (entryId: string, payload: { content: string; priority: Priority; tags: string[]; due_date?: string | null; parent_id?: string | null }) => Promise<Entry>;
  onUpdateStatus: (entryId: string, taskStatus: TaskStatus) => Promise<void>;
  onFetchSubtasks?: (parentId: string) => Promise<Entry[]>;
  onCreateSubtask?: (parentId: string, data: { content: string; priority?: Priority; tags: string[]; due_date?: string | null }) => Promise<Entry>;
  loading: boolean;
  isCompletedTab?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  tagFilter?: string;
  onTagFilterChange?: (value: string) => void;
  statusFilter?: "" | TaskStatus;
  onStatusFilterChange?: (value: "" | TaskStatus) => void;
  tagsForFilter?: Tag[];
  onClearFilters?: () => void;
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
  onFetchSubtasks,
  onCreateSubtask,
  loading,
  isCompletedTab = false,
  search = "",
  onSearchChange,
  tagFilter = "",
  onTagFilterChange,
  statusFilter = "",
  onStatusFilterChange,
  tagsForFilter = [],
  onClearFilters,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subtasksByParentId, setSubtasksByParentId] = useState<Record<string, Entry[]>>({});
  const [loadingSubtasksFor, setLoadingSubtasksFor] = useState<string | null>(null);
  const [addingSubtaskForId, setAddingSubtaskForId] = useState<string | null>(null);
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const [newSubtaskDue, setNewSubtaskDue] = useState("");
  const [savingSubtaskForId, setSavingSubtaskForId] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<Entry | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const dropHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newSubtaskInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => setMounted(true), []);

  // Focus the new subtask textbox when the add-subtask row is shown
  useEffect(() => {
    if (!addingSubtaskForId) return;
    const input = newSubtaskInputRef.current;
    if (input) {
      const id = requestAnimationFrame(() => {
        input.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [addingSubtaskForId]);

  const idToEntry = useMemo(() => {
    const m = new Map<string, Entry>();
    entries.forEach((e) => m.set(e.id, e));
    Object.values(subtasksByParentId).forEach((list) => list.forEach((e) => m.set(e.id, e)));
    return m;
  }, [entries, subtasksByParentId]);

  const entryIdsWithSubtasks = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            (typeof e.subtask_count === "number" && e.subtask_count > 0) ||
            (e.id in subtasksByParentId && (subtasksByParentId[e.id]?.length ?? 0) > 0)
        )
        .map((e) => e.id),
    [entries, subtasksByParentId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDndDragStart = (event: DragStartEvent) => {
    const entry = idToEntry.get(String(event.active.id));
    if (entry) setDraggedEntry(entry);
  };

  const handleDndDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const captured = idToEntry.get(String(active.id));
    setDraggedEntry(null);
    if (!captured || !over) return;
    const overId = String(over.id);
    if (overId === active.id) return; // can't drop on self
    // Dropping on "top-level" zone → move to top-level. Dropping on a task/subtask → add to that task's parent.
    let newParentId: string | null;
    if (overId === DND_TOP_LEVEL_ID) {
      newParentId = null;
    } else {
      const overEntry = idToEntry.get(overId);
      if (overEntry?.parent_id) {
        newParentId = overEntry.parent_id;
      } else {
        newParentId = overId;
      }
    }
    const oldParentId = captured.parent_id ?? null;
    if (newParentId === oldParentId) return;

    // Optimistic update: move the item in the UI immediately so it doesn't "fly back"
    const movedEntry: Entry = { ...captured, parent_id: newParentId };
    const prevSubtasks = { ...subtasksByParentId };
    setSubtasksByParentId((prev) => {
      const next = { ...prev };
      if (oldParentId) {
        next[oldParentId] = (next[oldParentId] ?? []).filter((e) => e.id !== captured.id);
      }
      // Only add to new parent when moving from another parent (not from top-level, to avoid duplicate in UI)
      if (newParentId && oldParentId !== null) {
        next[newParentId] = [...(next[newParentId] ?? []), movedEntry];
      }
      return next;
    });
    if (newParentId) setExpandedIds((prev) => new Set([...prev, newParentId]));
    if (dropHighlightTimerRef.current) clearTimeout(dropHighlightTimerRef.current);
    setJustDroppedId(captured.id);
    dropHighlightTimerRef.current = setTimeout(() => {
      setJustDroppedId(null);
      dropHighlightTimerRef.current = null;
    }, 600);

    try {
      await onUpdateEntry(captured.id, {
        content: captured.content,
        priority: (captured.priority as Priority) ?? "medium",
        tags: captured.tags,
        due_date: captured.due_date ?? null,
        parent_id: newParentId,
      });
      // Refetch to sync with server (keeps counts and order correct)
      if (oldParentId && onFetchSubtasks) {
        onFetchSubtasks(oldParentId).then((list) =>
          setSubtasksByParentId((prev) => ({ ...prev, [oldParentId]: list }))
        );
      }
      if (newParentId && onFetchSubtasks) {
        onFetchSubtasks(newParentId).then((list) =>
          setSubtasksByParentId((prev) => ({ ...prev, [newParentId]: list }))
        );
      }
    } catch {
      if (dropHighlightTimerRef.current) {
        clearTimeout(dropHighlightTimerRef.current);
        dropHighlightTimerRef.current = null;
      }
      setJustDroppedId(null);
      setSubtasksByParentId(prevSubtasks);
      setError("Failed to move task. Try again.");
    }
  };

  // Expand all tasks by default and fetch their subtasks when the entry list changes
  const entryIdsKey = entries.map((e) => e.id).join(",");
  useEffect(() => {
    if (entries.length === 0 || !onFetchSubtasks) return;
    setExpandedIds(new Set(entries.map((e) => e.id)));
    entries.forEach((entry) => {
      onFetchSubtasks(entry.id).then((list) =>
        setSubtasksByParentId((prev) => ({ ...prev, [entry.id]: list }))
      );
    });
  }, [entryIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (entryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    if (!subtasksByParentId[entryId] && onFetchSubtasks) {
      setLoadingSubtasksFor(entryId);
      onFetchSubtasks(entryId)
        .then((list) => setSubtasksByParentId((prev) => ({ ...prev, [entryId]: list })))
        .finally(() => setLoadingSubtasksFor(null));
    }
  };

  const submitNewSubtask = async (parentId: string) => {
    const content = newSubtaskContent.trim();
    if (!content || !onCreateSubtask) return;
    setSavingSubtaskForId(parentId);
    setError(null);
    try {
      await onCreateSubtask(parentId, {
        content,
        tags: [],
        due_date: newSubtaskDue.trim() || null,
      });
      setNewSubtaskContent("");
      setNewSubtaskDue("");
      setAddingSubtaskForId(null);
      const list = onFetchSubtasks ? await onFetchSubtasks(parentId) : [];
      setSubtasksByParentId((prev) => ({ ...prev, [parentId]: list }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subtask");
    } finally {
      setSavingSubtaskForId(null);
    }
  };

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
        parent_id: editModalEntry.parent_id ?? null,
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

  const handleStatusChange = async (entryId: string, taskStatus: TaskStatus, parentId?: string) => {
    setUpdatingStatusId(entryId);
    setError(null);
    if (editModalEntry?.id === entryId) {
      closeEditModal();
    }
    try {
      await onUpdateStatus(entryId, taskStatus);
      if (parentId != null && onFetchSubtasks) {
        const list = await onFetchSubtasks(parentId);
        setSubtasksByParentId((prev) => ({ ...prev, [parentId]: list }));
      }
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
      {onSearchChange != null && (
        <SearchBar
          search={search}
          onSearchChange={onSearchChange}
          tagFilter={tagFilter}
          onTagFilterChange={onTagFilterChange ?? (() => {})}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange ?? (() => {})}
          tagsForFilter={tagsForFilter}
          onClearFilters={onClearFilters}
          embedded
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Tasks
        </h2>
        <div className="flex items-center gap-3">
          {onFetchSubtasks &&
            (expandedIds.size > 0 ? (
              <button
                type="button"
                onClick={() => setExpandedIds(new Set())}
                className="text-xs text-sky-600 hover:underline dark:text-sky-400"
              >
                Collapse all
              </button>
            ) : entryIdsWithSubtasks.length > 0 ? (
              <button
                type="button"
                onClick={() => setExpandedIds(new Set(entryIdsWithSubtasks))}
                className="text-xs text-sky-600 hover:underline dark:text-sky-400"
              >
                Expand all
              </button>
            ) : null)}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {total === 0
              ? "No tasks yet"
              : `Showing ${startIndex}-${endIndex} of ${total}`}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDndDragStart}
        onDragEnd={handleDndDragEnd}
      >
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
              {mounted ? (
                <>
                  {draggedEntry && entries.length > 0 && (
                    <DroppableTr
                      id={DND_TOP_LEVEL_ID}
                      className="border-b border-slate-200 text-center text-xs text-slate-500 transition-colors duration-150 dark:border-slate-800 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30"
                    >
                      <td colSpan={6} className="py-2">
                        Drop here for top-level task
                      </td>
                    </DroppableTr>
                  )}
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
                  <React.Fragment key={entry.id}>
                  <DraggableDroppableTr
                    id={entry.id}
                    onDoubleClick={() => openEditModal(entry)}
                    className={`border-b border-slate-200 align-top last:border-0 hover:bg-slate-100 dark:border-slate-800/70 dark:hover:bg-slate-800/30 ${
                      draggedEntry?.id === entry.id
                        ? "bg-slate-100/80 opacity-60 dark:bg-slate-800/50"
                        : justDroppedId === entry.id
                          ? "animate-drop-in bg-sky-50 dark:bg-sky-900/40 ring-1 ring-inset ring-sky-300/70 dark:ring-sky-500/40"
                          : ""
                    }`}
                  >
                    <td className={`max-w-xl px-2 py-2 text-sm ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-900 dark:text-slate-100"}`}>
                      <div className="flex items-center gap-1.5">
                        {onFetchSubtasks && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(entry.id);
                              }}
                              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                              aria-label={expandedIds.has(entry.id) ? "Collapse subtasks" : "Expand subtasks"}
                            >
                              {expandedIds.has(entry.id) ? "▼" : "▶"}
                            </button>
                            {(typeof entry.subtask_count === "number" || entry.id in subtasksByParentId) && (
                              <span className="min-w-[1.25rem] text-[10px] text-slate-400 dark:text-slate-500" aria-label={`${(subtasksByParentId[entry.id]?.length ?? entry.subtask_count ?? 0)} subtask(s)`}>
                                ({subtasksByParentId[entry.id] ? subtasksByParentId[entry.id].length : (entry.subtask_count ?? 0)})
                              </span>
                            )}
                          </span>
                        )}
                        <span>{entry.content}</span>
                        {onCreateSubtask && onFetchSubtasks && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!expandedIds.has(entry.id)) {
                                toggleExpand(entry.id);
                              }
                              setAddingSubtaskForId(entry.id);
                              setNewSubtaskContent("");
                              setNewSubtaskDue(entry.due_date ?? "");
                            }}
                            className="ml-1 shrink-0 text-[10px] text-sky-600 hover:underline dark:text-sky-400"
                          >
                            + Add subtask
                          </button>
                        )}
                      </div>
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
                    <td className={`whitespace-nowrap px-2 py-2 text-xs ${isOverdue ? "text-orange-600 font-medium dark:text-orange-200" : "text-slate-500 dark:text-slate-400"}`}>
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
                  </DraggableDroppableTr>
                  {expandedIds.has(entry.id) && (
                    <>
                      {loadingSubtasksFor === entry.id ? (
                        <tr key={`subtasks-loading-${entry.id}`}>
                          <td colSpan={6} className="bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                            Loading subtasks…
                          </td>
                        </tr>
                      ) : (
                        (subtasksByParentId[entry.id] ?? []).map((sub) => {
                          const subOverdue =
                            !isCompletedTab &&
                            !!sub.due_date &&
                            sub.due_date < new Date().toISOString().slice(0, 10);
                          const subStatus = (sub.task_status ?? "not_started") as TaskStatus;
                          return (
                            <DraggableDroppableTr
                              key={sub.id}
                              id={sub.id}
                              onDoubleClick={() => openEditModal(sub)}
                              className={`border-b border-slate-200 bg-slate-50/80 align-top last:border-0 hover:bg-slate-100 dark:border-slate-800/70 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 ${
                                draggedEntry?.id === sub.id
                                  ? "bg-slate-200/60 opacity-60 dark:bg-slate-800/60"
                                  : justDroppedId === sub.id
                                    ? "animate-drop-in bg-sky-100/90 dark:bg-sky-900/50 ring-1 ring-inset ring-sky-300/70 dark:ring-sky-500/40"
                                    : ""
                              }`}
                            >
                              <td className="max-w-xl px-2 py-1.5 pl-8 text-sm text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 dark:text-slate-400">↳ </span>
                                  {sub.content}
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {sub.tags.length === 0 ? (
                                    <span className="text-xs text-slate-500">—</span>
                                  ) : (
                                    sub.tags.map((t) => <TagChip key={t} label={t} />)
                                  )}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                                {sub.priority ?? "medium"}
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                                {sub.due_date ? new Date(sub.due_date + "T12:00:00").toLocaleDateString() : "—"}
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                                {new Date(sub.created_at).toLocaleString()}
                              </td>
                              <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={subStatus}
                                  onChange={(e) => {
                                    const v = e.target.value as TaskStatus;
                                    void handleStatusChange(sub.id, v, entry.id);
                                  }}
                                  disabled={updatingStatusId === sub.id}
                                  className="w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  {TASK_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </DraggableDroppableTr>
                          );
                        })
                      )}
                      {addingSubtaskForId === entry.id && (
                        <tr key={`add-subtask-${entry.id}`}>
                          <td colSpan={6} className="bg-sky-50/80 px-2 py-2 pl-8 dark:bg-sky-950/30">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={newSubtaskInputRef}
                                type="text"
                                value={newSubtaskContent}
                                onChange={(e) => setNewSubtaskContent(e.target.value)}
                                placeholder="Subtask content"
                                className="min-w-[160px] rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                onKeyDown={(e) => e.key === "Enter" && void submitNewSubtask(entry.id)}
                              />
                              <input
                                type="date"
                                value={newSubtaskDue}
                                onChange={(e) => setNewSubtaskDue(e.target.value)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => void submitNewSubtask(entry.id)}
                                disabled={!newSubtaskContent.trim() || savingSubtaskForId === entry.id}
                                className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                              >
                                {savingSubtaskForId === entry.id ? "Adding…" : "Add"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingSubtaskForId(null);
                                  setNewSubtaskContent("");
                                  setNewSubtaskDue("");
                                }}
                                className="rounded border border-slate-400 px-2 py-1 text-xs dark:border-slate-600 dark:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  </React.Fragment>
                );
              })
            )}
                </>
              ) : (
                <>
                  {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-xs text-slate-500 dark:text-slate-500">
                      {loading ? "Loading..." : "No tasks match your filters."}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const isOverdue = !isCompletedTab && !!entry.due_date && entry.due_date < today;
                    const currentStatus = (entry.task_status ?? "not_started") as TaskStatus;
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          onDoubleClick={() => openEditModal(entry)}
                          className="border-b border-slate-200 align-top last:border-0 hover:bg-slate-100 dark:border-slate-800/70 dark:hover:bg-slate-800/30"
                        >
                          <td className={`max-w-xl px-2 py-2 text-sm ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-900 dark:text-slate-100"}`}>
                            <div className="flex items-center gap-1.5">
                              {onFetchSubtasks && (
                                <span className="flex shrink-0 items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(entry.id); }}
                                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    aria-label={expandedIds.has(entry.id) ? "Collapse subtasks" : "Expand subtasks"}
                                  >
                                    {expandedIds.has(entry.id) ? "▼" : "▶"}
                                  </button>
                                  {(typeof entry.subtask_count === "number" || entry.id in subtasksByParentId) && (
                                    <span className="min-w-[1.25rem] text-[10px] text-slate-400 dark:text-slate-500">
                                      ({subtasksByParentId[entry.id] ? subtasksByParentId[entry.id].length : (entry.subtask_count ?? 0)})
                                    </span>
                                  )}
                                </span>
                              )}
                              <span>{entry.content}</span>
                              {onCreateSubtask && onFetchSubtasks && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!expandedIds.has(entry.id)) toggleExpand(entry.id);
                                    setAddingSubtaskForId(entry.id);
                                    setNewSubtaskContent("");
                                    setNewSubtaskDue(entry.due_date ?? "");
                                  }}
                                  className="ml-1 shrink-0 text-[10px] text-sky-600 hover:underline dark:text-sky-400"
                                >
                                  + Add subtask
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={`px-2 py-2 ${isOverdue ? "text-orange-600 dark:text-orange-200" : ""}`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {entry.tags.length === 0 ? (
                                <span className={`text-xs ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-500"}`}>No tags</span>
                              ) : (
                                entry.tags.map((t) => <TagChip key={t} label={t} className={isOverdue ? "!text-orange-600 dark:!text-orange-200" : undefined} />)
                              )}
                            </div>
                          </td>
                          <td className={`whitespace-nowrap px-2 py-2 text-xs capitalize ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-600 dark:text-slate-300"}`}>
                            {entry.priority ?? "medium"}
                          </td>
                          <td className={`whitespace-nowrap px-2 py-2 text-xs ${isOverdue ? "text-orange-600 font-medium dark:text-orange-200" : "text-slate-500 dark:text-slate-400"}`}>
                            {entry.due_date ? new Date(entry.due_date + "T12:00:00").toLocaleDateString() : "—"}
                            {isOverdue && entry.due_date ? <span className="ml-1 text-[10px] text-orange-500 dark:text-orange-300/90">(overdue)</span> : null}
                          </td>
                          <td className={`whitespace-nowrap px-2 py-2 text-xs ${isOverdue ? "text-orange-600 dark:text-orange-200" : "text-slate-500 dark:text-slate-400"}`}>
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={currentStatus}
                              onChange={(e) => { const v = e.target.value as TaskStatus; void handleStatusChange(entry.id, v); }}
                              disabled={updatingStatusId === entry.id}
                              className="w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              aria-label="Task status"
                            >
                              {TASK_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        {expandedIds.has(entry.id) && (
                          <>
                            {loadingSubtasksFor === entry.id ? (
                              <tr key={`subtasks-loading-${entry.id}`}>
                                <td colSpan={6} className="bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">Loading subtasks…</td>
                              </tr>
                            ) : (
                              (subtasksByParentId[entry.id] ?? []).map((sub) => {
                                const subStatus = (sub.task_status ?? "not_started") as TaskStatus;
                                return (
                                  <tr
                                    key={sub.id}
                                    onDoubleClick={() => openEditModal(sub)}
                                    className={`border-b border-slate-200 bg-slate-50/80 align-top last:border-0 hover:bg-slate-100 dark:border-slate-800/70 dark:bg-slate-900/30 dark:hover:bg-slate-800/50 ${
                                      justDroppedId === sub.id ? "animate-drop-in bg-sky-100/90 dark:bg-sky-900/50 ring-1 ring-inset ring-sky-300/70 dark:ring-sky-500/40" : ""
                                    }`}
                                  >
                                    <td className="max-w-xl px-2 py-1.5 pl-8 text-sm text-slate-700 dark:text-slate-300">
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500 dark:text-slate-400">↳ </span>
                                        {sub.content}
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex flex-wrap gap-1">
                                        {sub.tags.length === 0 ? <span className="text-xs text-slate-500">—</span> : sub.tags.map((t) => <TagChip key={t} label={t} />)}
                                      </div>
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">{sub.priority ?? "medium"}</td>
                                    <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                                      {sub.due_date ? new Date(sub.due_date + "T12:00:00").toLocaleDateString() : "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">{new Date(sub.created_at).toLocaleString()}</td>
                                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                                      <select
                                        value={subStatus}
                                        onChange={(e) => { const v = e.target.value as TaskStatus; void handleStatusChange(sub.id, v, entry.id); }}
                                        disabled={updatingStatusId === sub.id}
                                        className="w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                      >
                                        {TASK_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                            {addingSubtaskForId === entry.id && (
                              <tr key={`add-subtask-${entry.id}`}>
                                <td colSpan={6} className="bg-sky-50/80 px-2 py-2 pl-8 dark:bg-sky-950/30">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      ref={newSubtaskInputRef}
                                      type="text"
                                      value={newSubtaskContent}
                                      onChange={(e) => setNewSubtaskContent(e.target.value)}
                                      placeholder="Subtask content"
                                      className="min-w-[160px] rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                                      onKeyDown={(e) => e.key === "Enter" && void submitNewSubtask(entry.id)}
                                    />
                                    <input type="date" value={newSubtaskDue} onChange={(e) => setNewSubtaskDue(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                                    <button type="button" onClick={() => void submitNewSubtask(entry.id)} disabled={!newSubtaskContent.trim() || savingSubtaskForId === entry.id} className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">
                                      {savingSubtaskForId === entry.id ? "Adding…" : "Add"}
                                    </button>
                                    <button type="button" onClick={() => { setAddingSubtaskForId(null); setNewSubtaskContent(""); setNewSubtaskDue(""); }} className="rounded border border-slate-400 px-2 py-1 text-xs dark:border-slate-600 dark:text-slate-300">Cancel</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                </>
              )}
            </tbody>
          </table>
        </div>
        {mounted &&
          typeof document !== "undefined" &&
          createPortal(
            <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
              {draggedEntry ? (
                <DragPreviewCard entry={draggedEntry} isSubtask={!!draggedEntry.parent_id} />
              ) : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

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

