"use client";

import type { DayGroup } from "@/components/calendar/calendar-utils";

export function CalendarRestOfWeek({
  days,
  selectedDay,
  onSelectDay,
}: {
  days: DayGroup[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const others = days.filter((d) => d.day !== selectedDay);
  if (others.length === 0) return null;

  return (
    <div className="app-card shrink-0 overflow-hidden p-0 md:max-h-80">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="app-section-label">Rest of week</p>
      </div>
      <ul className="divide-y divide-slate-50 p-2 md:max-h-[calc(20rem-2.5rem)] md:overflow-y-auto">
        {others.map((d) => (
          <li key={d.day}>
            <button
              type="button"
              onClick={() => onSelectDay(d.day)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <span>{d.label}</span>
              <span className="text-xs font-medium text-slate-400">
                {d.events.length === 0
                  ? "No events"
                  : `${d.events.length} event${d.events.length === 1 ? "" : "s"}`}
                <span className="ml-1 text-primary" aria-hidden>
                  →
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
