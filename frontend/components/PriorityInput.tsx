"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Priority } from "@/lib/api";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface PriorityInputProps {
  value: Priority;
  onChange: (value: Priority) => void;
}

export const PriorityInput: React.FC<PriorityInputProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentLabel = PRIORITIES.find((p) => p.value === value)?.label ?? "Medium";

  const updateRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 160),
      });
    } else {
      setDropdownRect(null);
    }
  };

  useEffect(() => {
    if (open) updateRect();
    else setDropdownRect(null);
  }, [open]);

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

  const dropdown =
    mounted &&
    open &&
    dropdownRect &&
    typeof document !== "undefined"
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
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  onChange(p.value);
                  setOpen(false);
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {p.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className={`flex min-w-[80px] cursor-pointer items-center gap-2 rounded-md border bg-white px-2 py-1 text-sm text-slate-900 outline-none dark:bg-slate-900 dark:text-slate-50 ${
          open ? "border-sky-500" : "border-slate-300 focus:border-sky-500 dark:border-slate-700"
        }`}
      >
        <span className="flex-1">{currentLabel}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400" aria-hidden>
          ▼
        </span>
      </div>
      {dropdown}
    </div>
  );
};
