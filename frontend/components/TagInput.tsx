"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { debounce } from "lodash-es";
import { fetchTags, Tag } from "@/lib/api";
import { TagChip } from "./TagChip";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  autoFocus = false,
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const valueLower = value.map((v) => v.toLowerCase());

  const loadSuggestions = useCallback(async (query: string) => {
    try {
      const res = await fetchTags(query || undefined);
      setSuggestions(res.items);
      if (!query.trim()) setAllTags(res.items);
    } catch {
      // Silently ignore suggestion errors
    }
  }, []);

  // Debounce search suggestions
  const debouncedLoad = useMemo(
    () =>
      debounce((q: string) => {
        void loadSuggestions(q);
      }, 250),
    [loadSuggestions]
  );

  // When dropdown opens with empty input, show all available tags
  useEffect(() => {
    if (open && !input.trim()) {
      void loadSuggestions("");
    }
  }, [open, input.trim(), loadSuggestions]);

  // When user types, fetch filtered suggestions
  useEffect(() => {
    if (!input.trim()) return;
    debouncedLoad(input.trim());
  }, [input, debouncedLoad]);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) return;
    if (valueLower.includes(normalized)) return;
    onChange([...value, normalized]);
    setInput("");
    setOpen(false);
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const visibleSuggestions = (input.trim() ? suggestions : allTags).filter(
    (s) => !valueLower.includes(s.name.toLowerCase())
  );

  // Position dropdown using getBoundingClientRect so it works inside overflow containers (e.g. table)
  const updateDropdownRect = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 200),
      });
    } else {
      setDropdownRect(null);
    }
  }, []);

  useEffect(() => {
    if (open && visibleSuggestions.length > 0) {
      updateDropdownRect();
    } else {
      setDropdownRect(null);
    }
  }, [open, visibleSuggestions.length, updateDropdownRect]);

  // Close dropdown when clicking outside the input or the dropdown
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const dropdownContent =
    open && visibleSuggestions.length > 0 && dropdownRect && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100] max-h-48 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            style={{
              top: dropdownRect.top + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {visibleSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addTag(s.name)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>{s.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {s.usage_count} used
                </span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1 focus-within:border-sky-500 dark:border-slate-700 dark:bg-slate-900">
        {value.map((tag) => (
          <TagChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}
        <input
          className="flex-1 min-w-[80px] bg-transparent px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-500"
          placeholder={placeholder}
          value={input}
          autoFocus={autoFocus}
          onFocus={() => {
            setOpen(true);
            if (visibleSuggestions.length > 0) updateDropdownRect();
          }}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            if (!next.trim()) {
              setSuggestions([]);
            }
          }}
          onKeyDown={handleKeyDown}
          suppressHydrationWarning
        />
      </div>
      {dropdownContent}
    </div>
  );
};

