"use client";

import type { DayGroup } from "@/components/calendar/calendar-utils";

const INDONESIA_HOLIDAY_CALENDAR = "hari libur di indonesia";

export function CalendarWeekStrip({
  days,
  selectedDay,
  onSelect,
}: {
  days: DayGroup[];
  selectedDay: string;
  onSelect: (day: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((d) => {
        const active = d.day === selectedDay;
        const date = new Date(`${d.day}T12:00:00`);
        const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isHoliday = d.events.some(
          (event) =>
            event.calendarName.trim().toLowerCase() === INDONESIA_HOLIDAY_CALENDAR,
        );
        const dayNum = d.day.slice(8, 10);

        const buttonClass = active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : isHoliday
            ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300"
            : isWeekend
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300"
              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200";

        return (
          <button
            key={d.day}
            type="button"
            onClick={() => onSelect(d.day)}
            className={`flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 transition-colors ${buttonClass}`}
          >
            <span className="text-[10px] font-semibold uppercase">{weekday}</span>
            <span className="text-sm font-bold tabular-nums">{dayNum}</span>
            <div className="mt-1 flex items-center gap-1">
              {d.events.length > 0 && (
                <span
                  className={`h-1 w-1 rounded-full ${
                    active ? "bg-blue-600" : "bg-slate-300"
                  }`}
                />
              )}
              {isWeekend && (
                <span
                  className={`h-1 w-1 rounded-full ${
                    active ? "bg-blue-600/80" : "bg-rose-400"
                  }`}
                  title="Weekend"
                  aria-label="Weekend"
                />
              )}
              {isHoliday && (
                <span
                  className={`h-1 w-1 rounded-full ${
                    active ? "bg-blue-700" : "bg-amber-500"
                  }`}
                  title="Holiday"
                  aria-label="Holiday"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
