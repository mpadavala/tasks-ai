"use client";

import React, { useRef, useState } from "react";
import { createEntry, Entry, type Priority } from "@/lib/api";
import { PriorityInput } from "./PriorityInput";
import { TagInput } from "./TagInput";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EntryFormProps {
  onCreated: (entry: Entry) => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({ onCreated }) => {
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState(todayDateString);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const openDueDatePicker = () => {
    const el = dueDateInputRef.current;
    if (!el) return;
    el.focus();
    try {
      if (typeof el.showPicker === "function") el.showPicker();
    } catch {
      // showPicker can throw in some contexts; ignore
    }
  };
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const entry = await createEntry({
        content: content.trim(),
        priority,
        tags,
        due_date: dueDate.trim() || null,
      });
      onCreated(entry);
      setContent("");
      setPriority("medium");
      setDueDate(todayDateString());
      setTags([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-md"
      suppressHydrationWarning
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          New Entry
        </h2>
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
      <textarea
        className="min-h-[96px] w-full resize-y rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        placeholder="Write your market note, idea, or observation..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (content.trim()) {
              e.currentTarget.form?.requestSubmit();
            }
          }
        }}
        suppressHydrationWarning
      />
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400">
          Priority
        </label>
        <PriorityInput value={priority} onChange={setPriority} />
      </div>
      <div
        className="cursor-pointer space-y-1"
        onClick={openDueDatePicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDueDatePicker();
          }
        }}
      >
        <label className="text-xs font-medium text-slate-400 pointer-events-none">
          Due date
        </label>
        <input
          ref={dueDateInputRef}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            openDueDatePicker();
          }}
          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-50 focus:border-sky-500 focus:outline-none [color-scheme:dark]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400">
          Tags
        </label>
        <TagInput value={tags} onChange={setTags} />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex items-center rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {submitting ? "Saving..." : "Save Entry"}
        </button>
      </div>
    </form>
  );
}

