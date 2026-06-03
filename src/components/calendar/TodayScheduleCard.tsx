"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useScheduleClock } from "@/components/calendar/useScheduleClock";
import {
  CalendarConnectionEmpty,
  CalendarLoadingSkeleton,
} from "@/components/calendar/CalendarConnectionEmpty";
import { HomeScheduleNowWindow } from "@/components/calendar/HomeScheduleNowWindow";
import {
  buildHome24HourWindow,
  eventIntersectsWindow,
  filterEventsByVisibleCalendars,
  HOME_24H_WINDOW_MS,
  sortEventsWithinDay,
} from "@/components/calendar/calendar-utils";
import { useHiddenCalendars } from "@/components/calendar/useHiddenCalendars";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

/** Tall schedule card — no max-height cap; inner chart clips only horizontally. */
const HOME_SCHEDULE_CARD_CLASS = "min-h-[19rem] lg:min-h-[23rem]";

type ScheduleState =
  | { kind: "loading" }
  | { kind: "not_configured" }
  | { kind: "not_connected" }
  | { kind: "empty" }
  | { kind: "events"; events: CalendarEventSummary[] };

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

      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const t0 = Date.now();
      const half = HOME_24H_WINDOW_MS / 2;
      const buffer = 60 * 60 * 1000;
      const eventsParams = new URLSearchParams({
        from: new Date(t0 - half - buffer).toISOString(),
        to: new Date(t0 + half + buffer).toISOString(),
      });
      if (clientTz) eventsParams.set("tz", clientTz);
      const eventsRes = await fetch(
        `/api/calendar/events?${eventsParams.toString()}`,
      );
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
  const window = buildHome24HourWindow(now);
  const hasVisibleEvents = visibleEvents.some((e) =>
    eventIntersectsWindow(e, window.winStartMs, window.winEndMs),
  );

  return (
    <section className="flex h-full min-h-0 flex-col space-y-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="app-section-label">Next 24 hours</p>
        <Link
          href="/calendar"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Full week →
        </Link>
      </div>

      <div
        className={`app-card flex flex-col p-0 ${HOME_SCHEDULE_CARD_CLASS}`}
      >
        {state.kind === "loading" && (
          <div className="p-3">
            <CalendarLoadingSkeleton rows={3} />
          </div>
        )}

        {state.kind === "not_connected" && (
          <CalendarConnectionEmpty variant="compact" />
        )}

        {(state.kind === "empty" ||
          (state.kind === "events" && !hasVisibleEvents)) && (
            <p className="px-4 py-8 text-center text-xs text-slate-400">
              No events in the next 24 hours
            </p>
          )}

        {state.kind === "events" && hasVisibleEvents && (
          <HomeScheduleNowWindow events={visibleEvents} now={now} />
        )}
      </div>
    </section>
  );
}
