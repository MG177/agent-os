"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarAgendaPanel } from "@/components/calendar/CalendarAgendaPanel";
import {
  CalendarConnectionEmpty,
  CalendarLoadingSkeleton,
} from "@/components/calendar/CalendarConnectionEmpty";
import { CalendarDayAgendaPanel } from "@/components/calendar/CalendarDayAgendaPanel";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CalendarRightRail } from "@/components/calendar/CalendarRightRail";
import { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";
import {
  addDaysToKey,
  addMonthsToKey,
  buildMonthGridKeys,
  buildWeekKeys,
  filterEventsByVisibleCalendars,
  filterEventsForDay,
  formatEventDayLabel,
  formatWeekRangeLabel,
  localDateKey,
  startOfMonthKey,
  startOfWeekKey,
} from "@/components/calendar/calendar-utils";
import { useHiddenCalendars } from "@/components/calendar/useHiddenCalendars";
import { useScheduleClock } from "@/components/calendar/useScheduleClock";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Page, PageBody } from "@/components/ui/layout";

type DetailSpan = "day" | "week";
type MobileView = "month" | "detail";

function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      className={`inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 ${className ?? ""}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${value === id
            ? "bg-white text-blue-600 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailSpan, setDetailSpan] = useState<DetailSpan>("day");
  const [mobileView, setMobileView] = useState<MobileView>("detail");
  const [listMode, setListMode] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => localDateKey());
  const { hiddenCalendarIds, toggleCalendar } = useHiddenCalendars();
  const nowMs = useScheduleClock();
  const today = useMemo(() => localDateKey(), []);
  const hasLoadedRef = useRef(false);

  // The visible month grid is the widest window we render, and it always
  // covers the selected day/week detail — so a single month fetch suffices.
  const monthGrid = useMemo(() => buildMonthGridKeys(selectedDay), [selectedDay]);
  const fetchFrom = `${monthGrid[0].day}T00:00:00`;
  const fetchTo = `${addDaysToKey(monthGrid[0].day, 42)}T00:00:00`;
  const rangeKey = `${fetchFrom}|${fetchTo}`;

  const load = useCallback(
    async (from: string, to: string, opts?: { refresh?: boolean }) => {
      const refresh = opts?.refresh ?? false;
      if (hasLoadedRef.current || refresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({ from, to });
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (clientTz) params.set("tz", clientTz);
      if (refresh) params.set("refresh", "1");

      const res = await fetch(`/api/calendar/events?${params.toString()}`);
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

      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    load(fetchFrom, fetchTo);
    // Refetch only when the resolved month window changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const filteredEvents = useMemo(
    () =>
      events
        ? filterEventsByVisibleCalendars(events, hiddenCalendarIds)
        : [],
    [events, hiddenCalendarIds],
  );

  const detailDays = useMemo(
    () =>
      detailSpan === "week"
        ? buildWeekKeys(startOfWeekKey(selectedDay))
        : [selectedDay],
    [detailSpan, selectedDay],
  );

  const dayGroup = useMemo(
    () => ({
      day: selectedDay,
      label: formatEventDayLabel(selectedDay),
      events: filterEventsForDay(filteredEvents, selectedDay),
    }),
    [selectedDay, filteredEvents],
  );

  const weekGroups = useMemo(
    () =>
      detailDays.map((day) => ({
        day,
        label: formatEventDayLabel(day),
        events: filterEventsForDay(filteredEvents, day),
      })),
    [detailDays, filteredEvents],
  );

  // Month cell click: focus that day at the current detail span (mobile → detail).
  const selectFromMonth = useCallback((day: string) => {
    setSelectedDay(day);
    setMobileView("detail");
  }, []);

  // Week day-header click: zoom into that single day.
  const focusDayDetail = useCallback((day: string) => {
    setSelectedDay(day);
    setDetailSpan("day");
    setMobileView("detail");
  }, []);

  const stepPrev = () =>
    setSelectedDay((d) =>
      detailSpan === "week" ? addDaysToKey(startOfWeekKey(d), -7) : addDaysToKey(d, -1),
    );
  const stepNext = () =>
    setSelectedDay((d) =>
      detailSpan === "week" ? addDaysToKey(startOfWeekKey(d), 7) : addDaysToKey(d, 1),
    );
  const prevMonth = () =>
    setSelectedDay((d) => addMonthsToKey(startOfMonthKey(d), -1));
  const nextMonth = () =>
    setSelectedDay((d) => addMonthsToKey(startOfMonthKey(d), 1));

  const showScheduleChrome =
    !loading && error !== "not_connected" && events !== null;

  const detailCount =
    detailSpan === "week"
      ? weekGroups.reduce((n, g) => n + g.events.length, 0)
      : dayGroup.events.length;
  const noun = detailCount === 1 ? "event" : "events";
  const headerSubtitle = !showScheduleChrome
    ? "All connected calendars"
    : detailSpan === "week"
      ? `${formatWeekRangeLabel(detailDays[0])} · ${detailCount} ${noun}`
      : `${formatEventDayLabel(selectedDay)} · ${detailCount} ${noun}`;

  const mobileTab: "month" | DetailSpan =
    mobileView === "month" ? "month" : detailSpan;
  const onMobileTab = (tab: "month" | DetailSpan) => {
    if (tab === "month") setMobileView("month");
    else {
      setMobileView("detail");
      setDetailSpan(tab);
    }
  };

  const miniMonth = (
    <CalendarMonthGrid
      events={filteredEvents}
      selectedDay={selectedDay}
      highlightDays={detailDays}
      today={today}
      onSelectDay={selectFromMonth}
      onPrev={prevMonth}
      onNext={nextMonth}
    />
  );

  const rail = (
    <CalendarRightRail
      events={filteredEvents}
      allEvents={events ?? []}
      hiddenCalendarIds={hiddenCalendarIds}
      onToggleCalendar={toggleCalendar}
      nowMs={nowMs}
    />
  );

  return (
    <Page variant="dashboard">
      <PageHeader insetClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            Calendar
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
            {headerSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showScheduleChrome && (
            <>
              <Segmented
                ariaLabel="Calendar view (mobile)"
                className="md:hidden"
                value={mobileTab}
                onChange={onMobileTab}
                options={[
                  { id: "month", label: "Month" },
                  { id: "week", label: "Week" },
                  { id: "day", label: "Day" },
                ]}
              />
              <Segmented
                ariaLabel="Detail span"
                className="hidden md:inline-flex"
                value={detailSpan}
                onChange={setDetailSpan}
                options={[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                ]}
              />
              <button
                type="button"
                onClick={() => setListMode((v) => !v)}
                aria-pressed={listMode}
                className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 md:inline-flex"
              >
                {listMode ? "Grid" : "List"}
              </button>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={stepPrev}
                  aria-label="Previous"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay(today)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={stepNext}
                  aria-label="Next"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ›
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => load(fetchFrom, fetchTo, { refresh: true })}
            disabled={refreshing || loading}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </PageHeader>

      <PageBody>
        {!showScheduleChrome && (
          <div>
            {loading && <CalendarLoadingSkeleton rows={6} />}
            {!loading && error === "not_connected" && <CalendarConnectionEmpty />}
            {!loading && error && error !== "not_connected" && (
              <p className="py-16 text-center text-sm text-amber-700">{error}</p>
            )}
          </div>
        )}

        {showScheduleChrome && (
          <div className="flex flex-col gap-4 md:grid md:min-h-0 md:flex-1 md:grid-rows-1 md:grid-cols-12 md:gap-5 lg:gap-6">
            {/* Detail: scalable time-grid (or list) */}
            <div
              className={`${mobileView === "detail" ? "flex" : "hidden"
                } min-h-0 flex-col md:flex md:col-span-7 lg:col-span-8 xl:col-span-9`}
            >
              {listMode ? (
                detailSpan === "week" ? (
                  <CalendarAgendaPanel groups={weekGroups} />
                ) : (
                  <div className="app-card flex min-h-0 flex-col overflow-hidden p-0 md:flex-1">
                    <div className="min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
                      <CalendarDayAgendaPanel group={dayGroup} nowMs={nowMs} />
                    </div>
                  </div>
                )
              ) : (
                <CalendarTimeGrid
                  events={filteredEvents}
                  days={detailDays}
                  today={today}
                  selectedDay={selectedDay}
                  onFocusDay={focusDayDetail}
                />
              )}
            </div>

            {/* Mobile-only Month tab */}
            <div
              className={`${mobileView === "month" ? "flex" : "hidden"
                } min-h-0 flex-col md:hidden`}
            >
              {miniMonth}
            </div>

            {/* Rail (md+): mini-month navigator on top, then Now / Next / Calendars */}
            <div className="hidden min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-1 md:flex md:col-span-5 lg:col-span-4 xl:col-span-3">
              {miniMonth}
              {rail}
            </div>
          </div>
        )}

        <p className="shrink-0 text-center text-xs text-slate-400 md:hidden">
          <Link
            href="/settings/integrations"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Integration settings
          </Link>
        </p>
      </PageBody>
    </Page>
  );
}
