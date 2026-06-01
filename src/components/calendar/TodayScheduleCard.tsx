"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useScheduleClock } from "@/components/calendar/useScheduleClock";
import {
  CalendarConnectionEmpty,
  CalendarLoadingSkeleton,
} from "@/components/calendar/CalendarConnectionEmpty";
import { CalendarEventRow } from "@/components/calendar/CalendarEventRow";
import {
  buildHomeScheduleWindow,
  filterEventsByVisibleCalendars,
  getTimedEventTemporalState,
  sortEventsWithinDay,
} from "@/components/calendar/calendar-utils";
import { useHiddenCalendars } from "@/components/calendar/useHiddenCalendars";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

/** Max height of the schedule card on Home (scroll inside). */
const HOME_SCHEDULE_MAX_H =
  "max-h-[min(36vh,14rem)] lg:max-h-[min(44vh,22rem)]";

type ScheduleState =
  | { kind: "loading" }
  | { kind: "not_configured" }
  | { kind: "not_connected" }
  | { kind: "empty" }
  | { kind: "events"; events: CalendarEventSummary[] };

function HomeScheduleEventList({
  events,
  now,
}: {
  events: CalendarEventSummary[];
  now: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  const windowed = buildHomeScheduleWindow(events, { now });
  const { allDay, visibleTimed, nextEventId, moreCount, scrollAnchorId } =
    windowed;

  useEffect(() => {
    userScrolledRef.current = false;
  }, [events]);

  useEffect(() => {
    if (userScrolledRef.current || !scrollAnchorId) return;

    const run = () => {
      const root = scrollRef.current;
      if (!root) return;
      const anchor = root.querySelector('[data-schedule-anchor="true"]');
      if (anchor instanceof HTMLElement) {
        root.scrollTo({ top: anchor.offsetTop - 4, behavior: "auto" });
      }
    };

    const raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [scrollAnchorId, now, events]);

  const handleScroll = () => {
    userScrolledRef.current = true;
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        onScroll={handleScroll}
      >
        {allDay.length > 0 && (
          <div className="border-b border-slate-100">
            <p className="px-3 pb-0.5 pt-1.5 app-section-label">
              All day
            </p>
            {allDay.map((event) => (
              <CalendarEventRow
                key={event.id}
                event={event}
                dense
                showLocation={false}
                showNowBadge={false}
                temporalState={null}
              />
            ))}
          </div>
        )}
        <div className="divide-y divide-slate-50">
          {visibleTimed.map((event) => {
            const temporalState = getTimedEventTemporalState(
              event,
              nextEventId,
              now,
            );
            return (
              <CalendarEventRow
                key={event.id}
                event={event}
                dense
                showLocation={false}
                showNowBadge={false}
                temporalState={temporalState}
                scheduleAnchor={event.id === scrollAnchorId}
              />
            );
          })}
        </div>
      </div>
      {moreCount > 0 && (
        <div className="flex h-6 shrink-0 items-center justify-center border-t border-slate-100/80 px-2">
          <Link
            href="/calendar"
            className="text-[10px] font-medium leading-none text-blue-600 hover:text-blue-700"
          >
            +{moreCount} more today · Calendar →
          </Link>
        </div>
      )}
    </>
  );
}

export function TodayScheduleCard() {
  const [state, setState] = useState<ScheduleState>({ kind: "loading" });
  const now = useScheduleClock();
  const { hiddenCalendarIds } = useHiddenCalendars();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const statusRes = await fetch("/api/integrations/google-calendar/status");
      if (!statusRes.ok) {
        if (!cancelled) setState({ kind: "not_configured" });
        return;
      }
      const status = await statusRes.json();
      if (!status.configured) {
        if (!cancelled) setState({ kind: "not_configured" });
        return;
      }
      if (!status.connected) {
        if (!cancelled) setState({ kind: "not_connected" });
        return;
      }

      const eventsRes = await fetch("/api/calendar/events?range=today");
      if (eventsRes.status === 401) {
        if (!cancelled) setState({ kind: "not_connected" });
        return;
      }
      if (!eventsRes.ok) {
        if (!cancelled) setState({ kind: "empty" });
        return;
      }
      const data = await eventsRes.json();
      const events = sortEventsWithinDay(
        (data.events ?? []) as CalendarEventSummary[],
      );
      if (!cancelled) {
        setState(events.length ? { kind: "events", events } : { kind: "empty" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "not_configured") {
    return null;
  }

  const visibleEvents =
    state.kind === "events"
      ? filterEventsByVisibleCalendars(state.events, hiddenCalendarIds)
      : [];
  const hasVisibleEvents = visibleEvents.length > 0;

  return (
    <section className="space-y-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="app-section-label">Today&apos;s schedule</p>
        <Link
          href="/calendar"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Full week →
        </Link>
      </div>

      <div
        className={`app-card flex flex-col overflow-hidden p-0 ${HOME_SCHEDULE_MAX_H} min-h-[5.5rem]`}
      >
        {state.kind === "loading" && (
          <div className="p-2">
            <CalendarLoadingSkeleton rows={2} />
          </div>
        )}

        {state.kind === "not_connected" && (
          <CalendarConnectionEmpty variant="compact" />
        )}

        {(state.kind === "empty" ||
          (state.kind === "events" && !hasVisibleEvents)) && (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            No events today
          </p>
        )}

        {state.kind === "events" && hasVisibleEvents && (
          <HomeScheduleEventList events={visibleEvents} now={now} />
        )}
      </div>
    </section>
  );
}
