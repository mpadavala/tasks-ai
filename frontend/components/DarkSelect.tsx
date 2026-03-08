"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DarkSelectOption {
  value: string;
  label: string;
}

interface DarkSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: DarkSelectOption[];
  placeholder?: string;
  "aria-label"?: string;
}

export const DarkSelect: React.FC<DarkSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  "aria-label": ariaLabel = "Select option",
}) => {
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

  const currentLabel = value ? options.find((o) => o.value === value)?.label : null;

  const updateRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 120),
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
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-1.5 text-left text-xs text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 ${
                  opt.value === value ? "bg-slate-200 dark:bg-slate-800" : ""
                }`}
              >
                {opt.label}
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
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex min-w-[6rem] cursor-pointer items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5 text-xs text-slate-900 outline-none dark:bg-slate-950/60 dark:text-slate-50 ${
          open ? "border-sky-500" : "border-slate-300 focus:border-sky-500 dark:border-slate-700"
        }`}
      >
        <span className="truncate">
          {currentLabel ?? placeholder}
        </span>
        <span className="text-slate-500 dark:text-slate-400" aria-hidden>
          ▼
        </span>
      </div>
      {dropdown}
    </div>
  );
};
