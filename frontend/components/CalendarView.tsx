"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Entry } from "@/lib/api";
import { fetchEntries } from "@/lib/api";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthRange(month: Date): { from: string; to: string } {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

function getCalendarGrid(month: Date): (Date | null)[][] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startDay = first.getDay();
  const mondayFirst = startDay === 0 ? 6 : startDay - 1;
  const totalDays = last.getDate();
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  const padStart = mondayFirst;
  for (let i = 0; i < padStart; i++) week.push(null);
  for (let d = 1; d <= totalDays; d++) {
    week.push(new Date(y, m, d));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface CalendarViewProps {
  onEntryClick?: (entry: Entry) => void;
  search?: string;
  tagFilter?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onEntryClick,
  search,
  tagFilter,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMonth = useCallback(async () => {
    const { from, to } = getMonthRange(currentMonth);
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEntries({
        status: "active",
        from_date: from,
        to_date: to,
        sort_by: "due_date",
        order: "asc",
        limit: 500,
        offset: 0,
        search: search || undefined,
        tag: tagFilter || undefined,
      });
      setEntries(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [currentMonth, search, tagFilter]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const grid = getCalendarGrid(currentMonth);
  const tasksByDay = React.useMemo(() => {
    const map: Record<string, Entry[]> = {};
    entries.forEach((e) => {
      if (!e.due_date) return;
      const key = e.due_date;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = toDateKey(new Date());

  return (
    <section className="space-y-3 rounded-xl border border-slate-300 bg-slate-100/80 p-4 shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-slate-800 dark:text-slate-100">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 dark:border-slate-700">
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi} className="border-b border-slate-200 dark:border-slate-800/70">
                {week.map((day, di) => {
                  if (!day) {
                    return <td key={di} className="min-h-[80px] p-1 align-top" />;
                  }
                  const key = toDateKey(day);
                  const dayTasks = tasksByDay[key] ?? [];
                  const isToday = key === todayKey;
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  return (
                    <td
                      key={di}
                      className="min-h-[80px] w-[14.28%] align-top border border-slate-200 p-1 dark:border-slate-700/80"
                    >
                      <div
                        className={`flex min-h-[72px] flex-col rounded p-1 ${
                          !isCurrentMonth ? "opacity-40" : ""
                        } ${isToday ? "ring-1 ring-sky-500 dark:ring-sky-400" : ""}`}
                      >
                        <span
                          className={`text-right text-xs font-medium ${
                            isToday
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <div className="mt-0.5 flex flex-1 flex-col gap-0.5 overflow-hidden">
                          {loading ? (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              …
                            </span>
                          ) : (
                            dayTasks.slice(0, 3).map((entry) => (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => onEntryClick?.(entry)}
                                className="truncate rounded bg-sky-100 px-1 py-0.5 text-left text-[10px] text-slate-800 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-slate-200 dark:hover:bg-sky-800/70"
                                title={entry.content}
                              >
                                {entry.content.slice(0, 25)}
                                {entry.content.length > 25 ? "…" : ""}
                              </button>
                            ))
                          )}
                          {!loading && dayTasks.length > 3 && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              +{dayTasks.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
