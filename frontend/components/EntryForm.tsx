"use client";

import React, { useState } from "react";
import { createEntry, Entry, type Priority } from "@/lib/api";
import { DatePickerInput } from "./DatePickerInput";
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
      className="space-y-4 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-md dark:border-slate-800 dark:bg-slate-900/60"
      suppressHydrationWarning
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          New Task
        </h2>
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
      <textarea
        className="min-h-[96px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500"
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
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Priority
        </label>
        <PriorityInput value={priority} onChange={setPriority} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Due date
        </label>
        <DatePickerInput
          value={dueDate}
          onChange={setDueDate}
          aria-label="Due date"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Tags
        </label>
        <TagInput value={tags} onChange={setTags} />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600 dark:disabled:bg-slate-600"
        >
          {submitting ? "Saving..." : "Save Task"}
        </button>
      </div>
    </form>
  );
}

