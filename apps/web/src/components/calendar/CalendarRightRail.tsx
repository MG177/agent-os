"use client";

import Link from "next/link";
import {
  deriveCalendarVisual,
  deriveCalendarsFromEvents,
  findHappeningTimedEvent,
  findNextTimedEvent,
  formatEventTimeRange,
} from "@/components/calendar/calendar-utils";
import type { CalendarEventSummary } from "@agent-os/contracts/integrations/google-calendar/types";

export function CalendarRightRail({
  events,
  allEvents,
  hiddenCalendarIds,
  onToggleCalendar,
  nowMs,
}: {
  events: CalendarEventSummary[];
  /** Unfiltered list — calendar list stays complete when toggling off. */
  allEvents: CalendarEventSummary[];
  hiddenCalendarIds: ReadonlySet<string>;
  onToggleCalendar: (calendarId: string) => void;
  nowMs: number;
}) {
  const happening = findHappeningTimedEvent(events, nowMs);
  const next = findNextTimedEvent(events, nowMs);
  const calendars = deriveCalendarsFromEvents(allEvents);

  return (
    <aside className="space-y-4">
      {happening && (
        <div className="app-card space-y-2 p-4">
          <p className="app-section-label">Now</p>
          <p className="text-sm font-semibold text-slate-900">{happening.title}</p>
          <p className="text-xs text-slate-500">
            {formatEventTimeRange(happening)} · {happening.calendarName}
          </p>
          {happening.htmlLink && (
            <a
              href={happening.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Open in Google Calendar →
            </a>
          )}
        </div>
      )}

      <div className="app-card space-y-3 p-4">
        <p className="app-section-label">Next up</p>
        {next && next.id !== happening?.id ? (
          <>
            <p className="text-sm font-semibold text-slate-900">{next.title}</p>
            <p className="text-xs text-slate-500">
              {formatEventTimeRange(next)} · {next.calendarName}
            </p>
            {next.htmlLink && (
              <a
                href={next.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Open in Google Calendar →
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">No upcoming events this week</p>
        )}
      </div>

      {calendars.length > 0 && (
        <div className="app-card space-y-2 p-4">
          <p className="app-section-label">Calendars</p>
          <ul className="space-y-1">
            {calendars.map((cal) => {
              const visible = !hiddenCalendarIds.has(cal.id);
              const visual = deriveCalendarVisual(cal.id);
              return (
                <li key={cal.id}>
                  <button
                    type="button"
                    onClick={() => onToggleCalendar(cal.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold transition-colors ${visible
                        ? "bg-blue-50 text-blue-800"
                        : "text-slate-400 hover:bg-slate-50"
                      }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${visual.dot} ${visible ? "" : "opacity-40"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{cal.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="app-card space-y-2 p-4">
        <p className="app-section-label">Quick links</p>
        <Link
          href="/settings/integrations"
          className="block text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Integration settings →
        </Link>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Open Google Calendar →
        </a>
      </div>
    </aside>
  );
}
