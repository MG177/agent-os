"use client";

import type { ReactNode } from "react";
import {
  buildMonthGridKeys,
  deriveCalendarVisual,
  filterEventsForDay,
  formatMonthLabel,
  isWeekendDayKey,
} from "@/components/calendar/calendar-utils";
import type { CalendarEventSummary } from "@agent-os/contracts/integrations/google-calendar/types";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MAX_DOTS = 3;

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

/**
 * Compact, natural-height month picker used as the calendar navigator
 * (top of the right rail on desktop, the Month tab on mobile).
 */
export function CalendarMonthGrid({
  events,
  selectedDay,
  today,
  highlightDays,
  onSelectDay,
  onPrev,
  onNext,
  onToday,
}: {
  events: CalendarEventSummary[];
  /** Any day inside the month to render; also the focused cell. */
  selectedDay: string;
  today: string;
  /** Days tinted as the active range (e.g. the selected week). */
  highlightDays?: string[];
  onSelectDay: (day: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
}) {
  const cells = buildMonthGridKeys(selectedDay);
  const highlightSet = new Set(highlightDays ?? [selectedDay]);

  return (
    <div className="app-card shrink-0 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {formatMonthLabel(selectedDay)}
        </p>
        <div className="flex items-center gap-1">
          <NavButton label="Previous month" onClick={onPrev}>
            ‹
          </NavButton>
          {onToday && (
            <button
              type="button"
              onClick={onToday}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
          )}
          <NavButton label="Next month" onClick={onNext}>
            ›
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className="pb-1 text-center text-[10px] font-semibold uppercase text-slate-400"
          >
            {w}
          </div>
        ))}

        {cells.map((cell) => {
          const dayEvents = filterEventsForDay(events, cell.day);
          const isToday = cell.day === today;
          const isSelected = cell.day === selectedDay;
          const isHighlighted = highlightSet.has(cell.day);
          const weekend = isWeekendDayKey(cell.day);
          const dayNum = Number(cell.day.slice(8, 10));

          const cellBg =
            isHighlighted && !isSelected ? "bg-accent" : "hover:bg-slate-100";

          const numClass = isSelected
            ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
            : isToday
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary"
              : `text-[11px] font-semibold ${
                  !cell.inMonth
                    ? "text-slate-300"
                    : weekend
                      ? "text-rose-500"
                      : "text-slate-700"
                }`;

          return (
            <button
              key={cell.day}
              type="button"
              onClick={() => onSelectDay(cell.day)}
              aria-label={`${cell.day}, ${dayEvents.length} event${
                dayEvents.length === 1 ? "" : "s"
              }`}
              aria-pressed={isSelected}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${cellBg}`}
            >
              <span className={numClass}>{dayNum}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {dayEvents.slice(0, MAX_DOTS).map((event) => (
                  <span
                    key={event.id}
                    className={`h-1 w-1 rounded-full ${
                      isSelected
                        ? "bg-white/80"
                        : deriveCalendarVisual(event.calendarId).dot
                    }`}
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
