"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedDate = toDate(value);

  const updateRect = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
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
            className="rdp-dark fixed z-[100] rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl"
            style={{
              top: dropdownRect.top + 4,
              left: dropdownRect.left,
            }}
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
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        aria-label={ariaLabel ?? "Choose due date"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`min-w-[8rem] rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-left text-xs text-slate-50 focus:border-sky-500 focus:outline-none ${className}`}
      >
        {value || "Select date"}
      </button>
      {dropdown}
    </div>
  );
};
