"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDayAgendaPanel } from "@/components/calendar/CalendarDayAgendaPanel";
import {
  CalendarConnectionEmpty,
  CalendarLoadingSkeleton,
} from "@/components/calendar/CalendarConnectionEmpty";
import { CalendarRightRail } from "@/components/calendar/CalendarRightRail";
import { CalendarTimelineDay } from "@/components/calendar/CalendarTimelineDay";
import { CalendarWeekStrip } from "@/components/calendar/CalendarWeekStrip";
import {
  ViewToggle,
  type CalendarViewMode,
} from "@/components/calendar/ViewToggle";
import {
  buildWeekDayKeys,
  filterEventsByVisibleCalendars,
  formatSelectedDaySubtitle,
  groupEventsByDay,
  localDateKey,
} from "@/components/calendar/calendar-utils";
import { useScheduleClock } from "@/components/calendar/useScheduleClock";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<CalendarViewMode>("timeline");
  const [selectedDay, setSelectedDay] = useState(() => localDateKey());
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<Set<string>>(
    () => new Set(),
  );
  const nowMs = useScheduleClock();

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const res = await fetch(
      `/api/calendar/events?range=14days${refresh ? "&refresh=1" : ""}`,
    );
    if (res.status === 401) {
      setError("not_connected");
      setEvents([]);
    } else if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to load calendar");
      setEvents([]);
    } else {
      const data = await res.json();
      setEvents(data.events ?? []);
      setError(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEvents = useMemo(
    () =>
      events
        ? filterEventsByVisibleCalendars(events, hiddenCalendarIds)
        : [],
    [events, hiddenCalendarIds],
  );

  const weekDays = useMemo(
    () => buildWeekDayKeys(groupEventsByDay(filteredEvents)),
    [filteredEvents],
  );

  const selectedDayGroup = useMemo(
    () => weekDays.find((d) => d.day === selectedDay) ?? weekDays[0],
    [weekDays, selectedDay],
  );

  const toggleCalendar = useCallback((calendarId: string) => {
    setHiddenCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) next.delete(calendarId);
      else next.add(calendarId);
      return next;
    });
  }, []);

  const showScheduleChrome =
    !loading && error !== "not_connected" && events !== null;

  const dayFocusBody = () => {
    if (!selectedDayGroup) {
      return (
        <p className="py-12 text-center text-sm text-slate-400">
          No events in the next 14 days
        </p>
      );
    }

    if (view === "timeline") {
      return (
        <CalendarTimelineDay
          events={filteredEvents}
          day={selectedDayGroup.day}
          dayLabel={selectedDayGroup.label}
          hideHeader
        />
      );
    }

    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <CalendarDayAgendaPanel group={selectedDayGroup} nowMs={nowMs} />
      </div>
    );
  };

  return (
    <div className="app-screen app-screen-home flex h-full min-h-0! flex-1 flex-col gap-4 overflow-hidden">
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            Calendar
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
            {showScheduleChrome && selectedDayGroup
              ? formatSelectedDaySubtitle(
                selectedDayGroup.label,
                selectedDayGroup.events.length,
              )
              : "Next 14 days · all connected calendars"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showScheduleChrome && (
            <ViewToggle value={view} onChange={setView} />
          )}
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {showScheduleChrome && (
        <div className="shrink-0">
          <CalendarWeekStrip
            days={weekDays}
            selectedDay={selectedDayGroup?.day ?? selectedDay}
            onSelect={setSelectedDay}
          />
        </div>
      )}

      <div className="grid min-h-0 flex-1 md:grid-cols-12 md:items-stretch md:gap-6 lg:gap-8">
        <section
          className="flex min-h-0 flex-col gap-3 md:col-span-7 lg:col-span-8"
          aria-label="Schedule"
        >
          {loading && <CalendarLoadingSkeleton rows={5} />}

          {!loading && error === "not_connected" && <CalendarConnectionEmpty />}

          {!loading && error && error !== "not_connected" && (
            <p className="py-16 text-center text-sm text-amber-700">{error}</p>
          )}

          {showScheduleChrome && (
            <>
              <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedDayGroup?.label ?? "Day"}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {selectedDayGroup?.events.length ?? 0} event
                    {(selectedDayGroup?.events.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2.5 pt-0 sm:p-3 sm:pt-1.5">
                  {dayFocusBody()}
                </div>
              </div>

              <div className="shrink-0 md:hidden">
                <CalendarRightRail
                  events={filteredEvents}
                  allEvents={events ?? []}
                  hiddenCalendarIds={hiddenCalendarIds}
                  onToggleCalendar={toggleCalendar}
                  nowMs={nowMs}
                />
              </div>
            </>
          )}
        </section>

        {showScheduleChrome && (
          <aside className="hidden min-h-0 overflow-y-auto overscroll-contain md:col-span-5 md:block lg:col-span-4">
            <CalendarRightRail
              events={filteredEvents}
              allEvents={events ?? []}
              hiddenCalendarIds={hiddenCalendarIds}
              onToggleCalendar={toggleCalendar}
              nowMs={nowMs}
            />
          </aside>
        )}
      </div>

      <p className="shrink-0 text-center text-xs text-slate-400 md:hidden">
        <Link
          href="/settings/integrations"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          Integration settings
        </Link>
      </p>
    </div>
  );
}
