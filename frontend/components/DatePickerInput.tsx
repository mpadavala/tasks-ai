"use client";

import React, { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function toDate(value: string): Date | undefined {
  if (!value || value.length < 10) return undefined;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function fromDate(date: Date | undefined): string {
  if (!date) return "";
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

/** Format YYYY-MM-DD as MM/DD/YYYY for display */
function formatDisplayDate(value: string): string {
  if (!value || value.length < 10) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = toDate(value);

  const openPicker = () => {
    if (buttonRef.current) {
      setDropdownTop(buttonRef.current.offsetHeight + 4);
      setOpen(true);
    } else {
      setOpen((prev) => !prev);
    }
  };

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

  return (
    <div ref={containerRef} className="relative inline-block overflow-visible">
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-label={ariaLabel ?? "Choose due date"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`min-w-[8rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-50 ${className}`}
      >
        {value ? formatDisplayDate(value) : "Select date"}
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="rdp-dark absolute left-0 z-[100] rounded-lg border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          style={{ top: dropdownTop }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(fromDate(date));
                setOpen(false);
              }
            }}
            weekStartsOn={1}
            defaultMonth={selectedDate ?? new Date()}
            className="rdp-root"
          />
        </div>
      )}
    </div>
  );
};
