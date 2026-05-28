"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TIMELINE_END_HOUR,
  TIMELINE_SLOT_PX,
  TIMELINE_START_HOUR,
  deriveCalendarVisual,
  eventDurationMinutes,
  eventStartMinutes,
  filterEventsForDay,
  formatEventTimeRange,
} from "@/components/calendar/calendar-utils";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
  (_, i) => TIMELINE_START_HOUR + i,
);
const TIMELINE_ZOOM_KEY = "calendar.timeline.zoom";
const TIMELINE_ZOOM_LEVELS = [0.85, 1, 1.15, 1.3] as const;
const DEFAULT_TIMELINE_ZOOM = 1.15;
const TIMELINE_EVENT_MIN_HEIGHT = 36;
const TIMELINE_MAX_VISIBLE_LANES = 3;
const TIMELINE_LANE_OUTER_INSET_PX = 8;
const TIMELINE_LANE_GAP_PX = 6;

type PositionedTimedEvent = {
  event: CalendarEventSummary;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
};

type DenseClusterControl = {
  clusterId: string;
  key: string;
  top: number;
  hiddenCount: number;
  expanded: boolean;
};

export function CalendarTimelineDay({
  events,
  day,
  dayLabel,
  hideHeader = false,
}: {
  events: CalendarEventSummary[];
  day: string;
  dayLabel: string;
  /** When the parent card already shows the day title. */
  hideHeader?: boolean;
}) {
  const [zoom, setZoom] = useState<number>(DEFAULT_TIMELINE_ZOOM);
  const [expandedDenseClusters, setExpandedDenseClusters] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TIMELINE_ZOOM_KEY);
      if (!raw) return;
      const parsed = Number(raw);
      if (TIMELINE_ZOOM_LEVELS.includes(parsed as (typeof TIMELINE_ZOOM_LEVELS)[number])) {
        setZoom(parsed);
      }
    } catch {
      // Ignore storage access issues and keep default zoom.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIMELINE_ZOOM_KEY, String(zoom));
    } catch {
      // Ignore storage write issues.
    }
  }, [zoom]);

  const zoomIndex = useMemo(() => {
    const idx = TIMELINE_ZOOM_LEVELS.indexOf(
      zoom as (typeof TIMELINE_ZOOM_LEVELS)[number],
    );
    return idx >= 0 ? idx : TIMELINE_ZOOM_LEVELS.indexOf(DEFAULT_TIMELINE_ZOOM);
  }, [zoom]);

  const slotPx = useMemo(
    () => Math.round(TIMELINE_SLOT_PX * zoom),
    [zoom],
  );

  const dayEvents = filterEventsForDay(events, day);
  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  const gridHeight =
    (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * slotPx;

  const timelineLayout = useMemo(() => {
    const maxTop = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * slotPx;
    const timedBase = timed
      .map((event) => {
        const startMin = eventStartMinutes(event);
        const endMin = startMin + eventDurationMinutes(event);
        const rawTop = ((startMin - TIMELINE_START_HOUR * 60) / 60) * slotPx;
        const rawHeight = Math.max(
          (eventDurationMinutes(event) / 60) * slotPx,
          TIMELINE_EVENT_MIN_HEIGHT,
        );
        const rawBottom = rawTop + rawHeight;
        if (rawBottom <= 0 || rawTop >= maxTop) return null;
        const top = Math.max(0, rawTop);
        const bottom = Math.min(maxTop, rawBottom);
        const height = Math.max(TIMELINE_EVENT_MIN_HEIGHT, bottom - top);
        return { event, startMin, endMin, top, height };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    const clusters: Array<{
      id: string;
      items: typeof timedBase;
      maxEndMin: number;
      startTop: number;
      endTop: number;
    }> = [];

    timedBase.forEach((item) => {
      const current = clusters.at(-1);
      if (!current || item.startMin >= current.maxEndMin) {
        clusters.push({
          id: `${item.startMin}-${item.endMin}-${clusters.length}`,
          items: [item],
          maxEndMin: item.endMin,
          startTop: item.top,
          endTop: item.top + item.height,
        });
        return;
      }
      current.items.push(item);
      current.maxEndMin = Math.max(current.maxEndMin, item.endMin);
      current.startTop = Math.min(current.startTop, item.top);
      current.endTop = Math.max(current.endTop, item.top + item.height);
    });

    const positioned: PositionedTimedEvent[] = [];
    const denseControls: DenseClusterControl[] = [];

    clusters.forEach((cluster) => {
      const laneEndMins: number[] = [];
      const assigned = cluster.items.map((item) => {
        let lane = laneEndMins.findIndex((endMin) => item.startMin >= endMin);
        if (lane === -1) {
          lane = laneEndMins.length;
          laneEndMins.push(item.endMin);
        } else {
          laneEndMins[lane] = item.endMin;
        }
        return { ...item, lane };
      });

      const laneCount = laneEndMins.length;
      const isDense = laneCount > TIMELINE_MAX_VISIBLE_LANES;
      const expanded = expandedDenseClusters.has(cluster.id);
      const renderLaneCount =
        isDense && !expanded ? TIMELINE_MAX_VISIBLE_LANES : laneCount;
      const visibleItems =
        isDense && !expanded
          ? assigned.filter((item) => item.lane < TIMELINE_MAX_VISIBLE_LANES)
          : assigned;

      positioned.push(
        ...visibleItems.map((item) => ({
          event: item.event,
          startMin: item.startMin,
          endMin: item.endMin,
          top: item.top,
          height: item.height,
          lane: item.lane,
          laneCount: renderLaneCount,
        })),
      );

      if (isDense) {
        denseControls.push({
          clusterId: cluster.id,
          key: `${cluster.id}-top`,
          top: Math.max(0, cluster.startTop + 4),
          hiddenCount: Math.max(0, assigned.length - visibleItems.length),
          expanded,
        });
        if (cluster.endTop - cluster.startTop > 140) {
          denseControls.push({
            clusterId: cluster.id,
            key: `${cluster.id}-bottom`,
            top: Math.max(0, cluster.endTop - 28),
            hiddenCount: Math.max(0, assigned.length - visibleItems.length),
            expanded,
          });
        }
      }
    });

    return { positioned, denseControls };
  }, [timed, slotPx, expandedDenseClusters]);

  const toggleDenseCluster = (clusterId: string) => {
    setExpandedDenseClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {!hideHeader && (
        <p className="app-section-label shrink-0">{dayLabel}</p>
      )}

      {allDay.length > 0 && (
        <div className="app-card shrink-0 space-y-1 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              All day
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {allDay.length} event{allDay.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="relative">
            <ul className="flex gap-1.5 overflow-x-auto pb-0.5 pr-4">
              {allDay.map((event) => (
                <li key={event.id} className="shrink-0">
                  <TimelineAllDayRow event={event} />
                </li>
              ))}
            </ul>
            {allDay.length > 1 && (
              <div
                className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-white to-transparent"
                aria-hidden
              />
            )}
          </div>
        </div>
      )}

      <div className="app-card flex min-h-[22rem] flex-1 flex-col overflow-hidden p-0 md:min-h-[26rem]">
        <div className="flex shrink-0 items-center justify-end gap-1 border-b border-slate-100 px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setZoom(TIMELINE_ZOOM_LEVELS[Math.max(0, zoomIndex - 1)])}
            disabled={zoomIndex === 0}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label="Zoom out timeline"
          >
            −
          </button>
          <span className="w-10 text-center text-[10px] font-semibold text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() =>
              setZoom(
                TIMELINE_ZOOM_LEVELS[
                Math.min(TIMELINE_ZOOM_LEVELS.length - 1, zoomIndex + 1)
                ],
              )
            }
            disabled={zoomIndex === TIMELINE_ZOOM_LEVELS.length - 1}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label="Zoom in timeline"
          >
            +
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative flex" style={{ minHeight: gridHeight }}>
            <div
              className="sticky left-0 z-10 w-12 shrink-0 border-r border-slate-100 bg-slate-50/80"
              style={{ minHeight: gridHeight }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end border-b border-slate-50 pr-2 pt-1 text-[10px] font-medium tabular-nums text-slate-400"
                  style={{ height: slotPx }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            <div
              className="relative min-w-0 flex-1"
              style={{ minHeight: gridHeight }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-slate-50"
                  style={{
                    top: (h - TIMELINE_START_HOUR) * slotPx,
                    height: slotPx,
                  }}
                />
              ))}

              {timed.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  No timed events
                </p>
              )}

              {timelineLayout.denseControls.map((control) => (
                <button
                  key={control.key}
                  type="button"
                  onClick={() => toggleDenseCluster(control.clusterId)}
                  aria-expanded={control.expanded}
                  className="absolute right-2 z-20 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                  style={{ top: control.top }}
                >
                  {control.expanded
                    ? "Show less"
                    : `+${control.hiddenCount} more`}
                </button>
              ))}

              {timelineLayout.positioned.map((item) => (
                <TimelineBlock
                  key={item.event.id}
                  event={item.event}
                  top={item.top}
                  height={item.height}
                  lane={item.lane}
                  laneCount={item.laneCount}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineAllDayRow({ event }: { event: CalendarEventSummary }) {
  const visual = deriveCalendarVisual(event.calendarId);
  const calendarShort = event.calendarName.slice(0, 2).toUpperCase();
  const content = (
    <div
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"
      title={`${event.title} · ${event.calendarName}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${visual.dot}`} />
      <p className="max-w-[16rem] truncate text-xs font-medium leading-tight text-slate-800">
        {event.title}
      </p>
      <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
        {calendarShort}
      </span>
    </div>
  );

  if (event.htmlLink) {
    return (
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${event.title} from ${event.calendarName} (opens in new tab)`}
        className="shrink-0 rounded-full hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        {content}
      </a>
    );
  }
  return <div className="shrink-0">{content}</div>;
}

function TimelineBlock({
  event,
  top,
  height,
  lane,
  laneCount,
}: {
  event: CalendarEventSummary;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}) {
  const visual = deriveCalendarVisual(event.calendarId);
  const className = `absolute overflow-hidden rounded-xl border px-2 py-1.5 shadow-sm ${visual.box}`;
  const widthPct = laneCount > 0 ? 100 / laneCount : 100;
  const leftPct = lane * widthPct;
  const perLaneGapPx =
    laneCount > 0
      ? (TIMELINE_LANE_OUTER_INSET_PX * 2 +
        TIMELINE_LANE_GAP_PX * Math.max(0, laneCount - 1)) /
      laneCount
      : 0;
  const style = laneCount <= 1
    ? {
      top,
      height,
      minHeight: TIMELINE_EVENT_MIN_HEIGHT,
      left: TIMELINE_LANE_OUTER_INSET_PX,
      right: TIMELINE_LANE_OUTER_INSET_PX,
    }
    : {
      top,
      height,
      minHeight: TIMELINE_EVENT_MIN_HEIGHT,
      left: `calc(${leftPct}% + ${TIMELINE_LANE_OUTER_INSET_PX + lane * TIMELINE_LANE_GAP_PX}px)`,
      width: `calc(${widthPct}% - ${perLaneGapPx}px)`,
    };
  const eventTooltip = `${event.title} · ${formatEventTimeRange(event)} · ${event.calendarName}`;
  const showTime = laneCount >= 3 ? height >= 52 : height >= 44;
  const showCalendar = laneCount >= 3 ? height >= 84 : height >= 64;

  const content = (
    <>
      <p className="truncate text-xs font-semibold">{event.title}</p>
      {showTime && (
        <p className="truncate text-[10px] opacity-80">
          {formatEventTimeRange(event)}
        </p>
      )}
      {showCalendar && (
        <p className="truncate text-[10px] opacity-70">{event.calendarName}</p>
      )}
    </>
  );

  if (event.htmlLink) {
    return (
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        title={eventTooltip}
        className={className}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} style={style} title={eventTooltip}>
      {content}
    </div>
  );
}
