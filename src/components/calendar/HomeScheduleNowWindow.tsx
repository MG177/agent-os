"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CalendarEventRow } from "@/components/calendar/CalendarEventRow";
import {
  buildHome24HourWindow,
  buildHomeScheduleWindow,
  deriveCalendarVisual,
  eventEndMs,
  eventIntersectsWindow,
  eventStartMs,
  formatEventTimeRange,
  formatHomeScheduleWindowLabel,
  formatMinutesClock,
  formatTimelineTick,
  getTimedEventTemporalState,
  isEventPast,
  isTimedEventHappeningNow,
  minutesFromTimestamp,
  sortEventsWithinDay,
} from "@/components/calendar/calendar-utils";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";
import type { EventTemporalState } from "@/components/calendar/calendar-utils";

/** ~2px per minute → 2880px-wide track for 24h (horizontal scroll). */
const PX_PER_MINUTE = 2;
const LANE_HEIGHT_PX = 36;
const TICK_ROW_PX = 40;
const MIN_TRACK_BODY_PX = 88;
const TICK_STEP_MS = 2 * 60 * 60 * 1000;

type PlacedEvent = {
  event: CalendarEventSummary;
  lane: number;
  leftPct: number;
  widthPct: number;
  temporal: "past" | "now" | "next" | null;
};

function assignLanesAndLayout(
  events: CalendarEventSummary[],
  winStartMs: number,
  winEndMs: number,
  spanMs: number,
  nextEventId: string | null,
  now: number,
): PlacedEvent[] {
  const visible = events
    .filter((e) => !e.allDay)
    .filter((e) => eventIntersectsWindow(e, winStartMs, winEndMs))
    .sort((a, b) => eventStartMs(a) - eventStartMs(b));

  const laneEnds: number[] = [];
  const placed: PlacedEvent[] = [];

  for (const event of visible) {
    const start = Math.max(eventStartMs(event), winStartMs);
    const end = Math.min(eventEndMs(event), winEndMs);

    let lane = laneEnds.findIndex((laneEnd) => start >= laneEnd);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;

    const leftPct = ((start - winStartMs) / spanMs) * 100;
    const widthPct = Math.max(((end - start) / spanMs) * 100, 1.2);

    placed.push({
      event,
      lane,
      leftPct,
      widthPct,
      temporal: getTimedEventTemporalState(event, nextEventId, now),
    });
  }

  return placed;
}

function buildTicksMs(winStartMs: number, winEndMs: number): number[] {
  const ticks: number[] = [];
  let t = Math.ceil(winStartMs / TICK_STEP_MS) * TICK_STEP_MS;
  while (t < winEndMs) {
    ticks.push(t);
    t += TICK_STEP_MS;
  }
  if (ticks.length === 0 || ticks[ticks.length - 1] < winEndMs - TICK_STEP_MS / 2) {
    ticks.push(winEndMs);
  }
  return ticks;
}

function scrollTimelineToNow(
  root: HTMLDivElement,
  trackWidthPx: number,
  smooth: boolean,
) {
  const nowX = trackWidthPx / 2;
  const target = nowX - root.clientWidth / 2;
  root.scrollTo({
    left: Math.max(0, target),
    behavior: smooth ? "smooth" : "auto",
  });
}

function scrollAgendaToAnchor(root: HTMLDivElement, smooth: boolean) {
  const el = root.querySelector("[data-schedule-anchor='true']");
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
}

function ScheduleNowDivider() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      role="separator"
      aria-label="Now"
    >
      <div className="h-px flex-1 bg-red-200" aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
        Now
      </span>
      <div className="h-px flex-1 bg-red-200" aria-hidden />
    </div>
  );
}

function shouldShowNowDivider(
  temporal: EventTemporalState | null,
  prevTemporal: EventTemporalState | null,
  index: number,
): boolean {
  if (temporal === "past") return false;
  if (index === 0 && temporal === "now") return true;
  return prevTemporal === "past";
}

export function HomeScheduleNowWindow({
  events,
  now,
}: {
  events: CalendarEventSummary[];
  now: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const agendaScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const userScrolledAgendaRef = useRef(false);

  const range = useMemo(() => buildHome24HourWindow(now), [now]);
  const { winStartMs, winEndMs, spanMs } = range;
  const anchorDayKey = new Date(winStartMs).toLocaleDateString("en-CA");

  const inWindow = useMemo(
    () =>
      events.filter((e) => eventIntersectsWindow(e, winStartMs, winEndMs)),
    [events, winStartMs, winEndMs],
  );

  const allDay = useMemo(
    () => inWindow.filter((e) => e.allDay),
    [inWindow],
  );

  const timed = useMemo(
    () => sortEventsWithinDay(inWindow.filter((e) => !e.allDay)),
    [inWindow],
  );

  const mobileAgenda = useMemo(
    () => buildHomeScheduleWindow(timed, { now }),
    [timed, now],
  );

  const nextEventId = useMemo(() => {
    return mobileAgenda.nextEventId;
  }, [mobileAgenda.nextEventId]);

  const trackWidthPx = Math.max(
    320,
    Math.round((spanMs / 60_000) * PX_PER_MINUTE),
  );

  const placed = useMemo(
    () =>
      assignLanesAndLayout(
        events,
        winStartMs,
        winEndMs,
        spanMs,
        nextEventId,
        now,
      ),
    [events, winStartMs, winEndMs, spanMs, nextEventId, now],
  );

  const maxLane = placed.reduce((m, p) => Math.max(m, p.lane), 0);
  const trackBodyHeight = Math.max(
    MIN_TRACK_BODY_PX,
    (maxLane + 1) * LANE_HEIGHT_PX,
  );
  const chartHeight = TICK_ROW_PX + trackBodyHeight;

  const moreCount = useMemo(
    () =>
      events.filter(
        (e) => !eventIntersectsWindow(e, winStartMs, winEndMs),
      ).length,
    [events, winStartMs, winEndMs],
  );

  const ticks = useMemo(
    () => buildTicksMs(winStartMs, winEndMs),
    [winStartMs, winEndMs],
  );

  const nowLeftPct = 50;

  useEffect(() => {
    userScrolledRef.current = false;
    userScrolledAgendaRef.current = false;
  }, [events]);

  const jumpToNow = useCallback(
    (smooth: boolean) => {
      userScrolledRef.current = false;
      userScrolledAgendaRef.current = false;
      const gantt = scrollRef.current;
      if (gantt) scrollTimelineToNow(gantt, trackWidthPx, smooth);
      const agenda = agendaScrollRef.current;
      if (agenda) scrollAgendaToAnchor(agenda, smooth);
    },
    [trackWidthPx],
  );

  useEffect(() => {
    if (userScrolledRef.current) return;
    const root = scrollRef.current;
    if (!root) return;

    const raf = requestAnimationFrame(() => {
      scrollTimelineToNow(root, trackWidthPx, false);
    });
    return () => cancelAnimationFrame(raf);
  }, [trackWidthPx, events, now]);

  useEffect(() => {
    if (userScrolledAgendaRef.current) return;
    const root = agendaScrollRef.current;
    if (!root || !mobileAgenda.scrollAnchorId) return;

    const raf = requestAnimationFrame(() => {
      scrollAgendaToAnchor(root, false);
    });
    return () => cancelAnimationFrame(raf);
  }, [events, now, mobileAgenda.scrollAnchorId]);

  const handleGanttScroll = () => {
    userScrolledRef.current = true;
  };

  const handleAgendaScroll = () => {
    userScrolledAgendaRef.current = true;
  };

  const agendaHiddenCount = Math.max(
    0,
    timed.length - mobileAgenda.visibleTimed.length,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-slate-100 px-3 pb-2.5 pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-medium text-slate-600">
            <span className="text-slate-400">Window </span>
            <span className="tabular-nums text-slate-800">
              {formatHomeScheduleWindowLabel(winStartMs, winEndMs)}
            </span>
          </span>
          <div className="inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold text-slate-800">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                aria-hidden
              />
              {formatMinutesClock(minutesFromTimestamp(now))}
            </span>
            <button
              type="button"
              onClick={() => jumpToNow(true)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 shadow-sm hover:border-red-200 hover:bg-red-50"
              aria-label="Scroll schedule to now"
            >
              Now
            </button>
          </div>
        </div>
        {allDay.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allDay.map((event) => (
              <span
                key={event.id}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                {event.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: vertical agenda */}
      <div className="flex flex-col md:hidden">
        <div
          ref={agendaScrollRef}
          className="max-h-[14rem] overflow-y-auto overscroll-y-contain"
          onScroll={handleAgendaScroll}
        >
          {mobileAgenda.visibleTimed.map((event, index) => {
            const temporal = getTimedEventTemporalState(
              event,
              nextEventId,
              now,
            );
            const prevTemporal =
              index > 0
                ? getTimedEventTemporalState(
                  mobileAgenda.visibleTimed[index - 1]!,
                  nextEventId,
                  now,
                )
                : null;
            const showDivider = shouldShowNowDivider(
              temporal,
              prevTemporal,
              index,
            );

            return (
              <div key={event.id}>
                {showDivider && <ScheduleNowDivider />}
                <CalendarEventRow
                  event={event}
                  dense
                  showNowBadge={false}
                  temporalState={temporal}
                  scheduleAnchor={event.id === mobileAgenda.scrollAnchorId}
                  startTimeLabel={formatTimelineTick(
                    eventStartMs(event),
                    anchorDayKey,
                  )}
                />
              </div>
            );
          })}
        </div>
        <p className="px-3 pb-2.5 pt-2 text-center text-[10px] text-slate-400">
          {timed.length} event{timed.length === 1 ? "" : "s"} in window
          {agendaHiddenCount > 0 && (
            <>
              {" "}
              ·{" "}
              <Link
                href="/calendar"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                +{agendaHiddenCount} more
              </Link>
            </>
          )}
        </p>
      </div>

      {/* md+: horizontal 24h Gantt */}
      <div className="hidden min-h-[10.5rem] flex-1 flex-col px-3 py-3 md:flex">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth"
          onScroll={handleGanttScroll}
        >
          <div
            className="relative"
            style={{ width: trackWidthPx, minWidth: "100%" }}
          >
            <div
              className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80"
              style={{ height: chartHeight }}
            >
              <div
                className="relative border-b border-slate-200/80 bg-white/60"
                style={{ height: TICK_ROW_PX }}
              >
                {ticks.map((ms) => {
                  const left = ((ms - winStartMs) / spanMs) * 100;
                  return (
                    <div
                      key={ms}
                      className="pointer-events-none absolute inset-y-0 flex items-center border-l border-slate-200/80 pl-1.5"
                      style={{ left: `${left}%` }}
                    >
                      <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-500">
                        {formatTimelineTick(ms, anchorDayKey)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="relative isolate px-1.5"
                style={{ height: trackBodyHeight }}
              >
                <div
                  className="pointer-events-none absolute inset-y-1 z-20 w-0.5 -translate-x-1/2 bg-red-500"
                  style={{ left: `${nowLeftPct}%` }}
                  aria-hidden
                />

                {placed.map(({ event, lane, leftPct, widthPct, temporal }) => {
                  const visual = deriveCalendarVisual(event.calendarId);
                  const isNow =
                    temporal === "now" || isTimedEventHappeningNow(event, now);
                  const isPast =
                    temporal === "past" || isEventPast(event, now);
                  const barClass = [
                    "absolute z-10 flex min-w-[2.25rem] items-center overflow-hidden rounded-lg px-2 text-[11px] font-semibold leading-tight text-white shadow-sm",
                    visual.dot,
                    isPast ? "opacity-40 saturate-75" : "",
                    isNow
                      ? "z-30 ring-2 ring-emerald-500 ring-inset"
                      : temporal === "next"
                        ? "z-20 ring-1 ring-inset ring-blue-300"
                        : "",
                    event.htmlLink
                      ? "cursor-pointer hover:brightness-110"
                      : "",
                  ].join(" ");

                  const style = {
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: lane * LANE_HEIGHT_PX + 4,
                    height: LANE_HEIGHT_PX - 8,
                  };
                  const title = `${event.title} · ${formatEventTimeRange(event)}`;

                  if (event.htmlLink) {
                    return (
                      <a
                        key={event.id}
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={barClass}
                        style={style}
                        title={title}
                      >
                        <span className="truncate">{event.title}</span>
                      </a>
                    );
                  }

                  return (
                    <div
                      key={event.id}
                      className={barClass}
                      style={style}
                      title={title}
                    >
                      <span className="truncate">{event.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2 shrink-0 text-center text-[10px] text-slate-400">
          24-hour view · swipe to scroll
        </p>
      </div>
      {/* end md+ Gantt */}

      {moreCount > 0 && (
        <div className="flex h-8 shrink-0 items-center justify-center border-t border-slate-100 px-2">
          <Link
            href="/calendar"
            className="text-[10px] font-medium leading-none text-blue-600 hover:text-blue-700"
          >
            +{moreCount} outside this window · Calendar →
          </Link>
        </div>
      )}
    </div>
  );
}
