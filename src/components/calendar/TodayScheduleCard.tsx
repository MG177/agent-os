"use client";

import Link from "next/link";
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
import { useResource } from "@/lib/data/useResource";
import { KEYS } from "@/lib/data/keys";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

type CalendarStatus = { configured: boolean; connected: boolean };
type EventsResponse = { events: CalendarEventSummary[] };

/** Tall schedule card — no max-height cap; inner chart clips only horizontally. */
const HOME_SCHEDULE_CARD_CLASS = "min-h-[19rem] lg:min-h-[23rem]";

/** Fetches the home 24h window using the current time for the URL, but uses a
 *  stable synthetic key so SWR/localStorage treats it as the same resource. */
async function calendarEventsFetcher(_key: string): Promise<EventsResponse> {
  const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const t0 = Date.now();
  const half = HOME_24H_WINDOW_MS / 2;
  const buffer = 60 * 60 * 1000;
  const params = new URLSearchParams({
    from: new Date(t0 - half - buffer).toISOString(),
    to: new Date(t0 + half + buffer).toISOString(),
  });
  if (clientTz) params.set("tz", clientTz);

  const res = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!res.ok) {
    const err = Object.assign(new Error(res.statusText), { status: res.status });
    throw err;
  }
  return res.json();
}

export function TodayScheduleCard() {
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
  } = useResource<CalendarStatus>(KEYS.calendarStatus);

  const now = useScheduleClock();
  const { hiddenCalendarIds } = useHiddenCalendars();

  // Only fetch events when we know the calendar is connected.
  const eventsKey = statusData?.connected ? KEYS.calendarHomeEvents : null;
  const {
    data: eventsData,
    error: eventsError,
    isLoading: eventsLoading,
  } = useResource<EventsResponse>(
    eventsKey,
    eventsKey ? calendarEventsFetcher : null,
  );

  // Calendar not configured (no OAuth creds on Vercel, etc.) — stay invisible.
  if (statusError || statusData?.configured === false) {
    return null;
  }

  const isLoading = statusLoading || (statusData?.connected && eventsLoading);

  const rawEvents =
    eventsData?.events ? sortEventsWithinDay(eventsData.events) : [];
  const visibleEvents = filterEventsByVisibleCalendars(
    rawEvents,
    hiddenCalendarIds,
  );
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

      <div className={`app-card flex flex-col p-0 ${HOME_SCHEDULE_CARD_CLASS}`}>
        {isLoading && !eventsData && (
          <div className="p-3">
            <CalendarLoadingSkeleton rows={3} />
          </div>
        )}

        {!isLoading && statusData?.connected === false && (
          <CalendarConnectionEmpty variant="compact" />
        )}

        {eventsError?.status === 401 && (
          <CalendarConnectionEmpty variant="compact" />
        )}

        {!isLoading &&
          !eventsError &&
          statusData?.connected &&
          (!hasVisibleEvents) && (
            <p className="px-4 py-8 text-center text-xs text-slate-400">
              No events in the next 24 hours
            </p>
          )}

        {hasVisibleEvents && (
          <HomeScheduleNowWindow events={visibleEvents} now={now} />
        )}
      </div>
    </section>
  );
}
