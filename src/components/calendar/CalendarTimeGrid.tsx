"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TIMELINE_END_HOUR,
  TIMELINE_SLOT_PX,
  TIMELINE_START_HOUR,
  clusterTimedEvents,
  deriveCalendarVisual,
  filterEventsForDay,
  formatEventTimeRange,
  formatEventTimeShort,
} from "@/components/calendar/calendar-utils";
import { useScheduleClock } from "@/components/calendar/useScheduleClock";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

const HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
  (_, i) => TIMELINE_START_HOUR + i,
);
const ZOOM_KEY = "calendar.timeline.zoom";
const ZOOM_LEVELS = [0.85, 1, 1.15, 1.3] as const;
const DEFAULT_ZOOM = 1.15;
const EVENT_MIN_HEIGHT = 32;
const LANE_GAP_PX = 2;

type PositionedBlock = {
  event: CalendarEventSummary;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
};

type DenseControl = {
  clusterKey: string;
  top: number;
  hiddenCount: number;
  expanded: boolean;
};

function buildColumnLayout(
  dayEvents: CalendarEventSummary[],
  slotPx: number,
  maxVisibleLanes: number,
  expanded: ReadonlySet<string>,
  dayKey: string,
): { positioned: PositionedBlock[]; denseControls: DenseControl[] } {
  const timed = dayEvents.filter((e) => !e.allDay);
  const clusters = clusterTimedEvents(timed, slotPx, {
    minHeight: EVENT_MIN_HEIGHT,
  });

  const positioned: PositionedBlock[] = [];
  const denseControls: DenseControl[] = [];

  clusters.forEach((cluster) => {
    const { laneCount } = cluster;
    const isDense = laneCount > maxVisibleLanes;
    const clusterKey = `${dayKey}:${cluster.id}`;
    const isExpanded = expanded.has(clusterKey);
    const renderLaneCount =
      isDense && !isExpanded ? maxVisibleLanes : laneCount;
    const visible =
      isDense && !isExpanded
        ? cluster.items.filter((item) => item.lane < maxVisibleLanes)
        : cluster.items;

    positioned.push(
      ...visible.map((item) => ({
        event: item.event,
        top: item.top,
        height: item.height,
        lane: item.lane,
        laneCount: renderLaneCount,
      })),
    );

    if (isDense) {
      denseControls.push({
        clusterKey,
        top: Math.max(0, cluster.startTop + 4),
        hiddenCount: Math.max(0, cluster.items.length - visible.length),
        expanded: isExpanded,
      });
    }
  });

  return { positioned, denseControls };
}

function TimeBlock({ block }: { block: PositionedBlock }) {
  const { event, top, height, lane, laneCount } = block;
  const visual = deriveCalendarVisual(event.calendarId);
  const widthPct = 100 / laneCount;
  const className = `absolute overflow-hidden rounded-lg border px-1.5 py-1 shadow-sm ${visual.box}`;
  const style = {
    top,
    height,
    minHeight: EVENT_MIN_HEIGHT,
    left: `${lane * widthPct}%`,
    width: `calc(${widthPct}% - ${LANE_GAP_PX}px)`,
  };
  const tooltip = `${event.title} · ${formatEventTimeRange(event)} · ${event.calendarName}`;
  const content = (
    <>
      <p className="truncate text-[11px] font-semibold leading-tight">
        {event.title}
      </p>
      {height >= 44 && (
        <p className="truncate text-[10px] leading-tight opacity-80">
          {formatEventTimeShort(event)}
        </p>
      )}
    </>
  );

  if (event.htmlLink) {
    return (
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltip}
        className={className}
        style={style}
      >
        {content}
      </a>
    );
  }
  return (
    <div className={className} style={style} title={tooltip}>
      {content}
    </div>
  );
}

function DayHeader({
  day,
  today,
  selected,
  onClick,
}: {
  day: string;
  today: string;
  selected: boolean;
  onClick?: () => void;
}) {
  const date = new Date(`${day}T12:00:00`);
  const isToday = day === today;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${day}`}
      className={`flex flex-col items-center gap-0.5 border-l border-slate-50 py-1.5 transition-colors first:border-l-0 hover:bg-slate-50 ${
        selected ? "bg-blue-50" : ""
      }`}
    >
      <span className="text-[10px] font-semibold uppercase text-slate-400">
        {date.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
      <span
        className={
          isToday
            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white"
            : "text-sm font-bold tabular-nums text-slate-700"
        }
      >
        {day.slice(8, 10)}
      </span>
    </button>
  );
}

/**
 * Vertical hour-axis grid with one column per day.
 * `days.length === 1` renders a single-day timeline; `7` renders a week.
 */
export function CalendarTimeGrid({
  events,
  days,
  today,
  selectedDay,
  onFocusDay,
}: {
  events: CalendarEventSummary[];
  /** 1 day (Day view) or 7 days (Week view). */
  days: string[];
  today: string;
  selectedDay: string;
  /** Clicking a day header (week view) focuses that day. */
  onFocusDay?: (day: string) => void;
}) {
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ZOOM_KEY);
      if (!raw) return;
      const parsed = Number(raw);
      if (ZOOM_LEVELS.includes(parsed as (typeof ZOOM_LEVELS)[number])) {
        setZoom(parsed);
      }
    } catch {
      // Ignore storage access issues and keep default zoom.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      // Ignore storage write issues.
    }
  }, [zoom]);

  const isWeek = days.length > 1;
  const maxVisibleLanes = isWeek ? 2 : 3;
  const slotPx = useMemo(() => Math.round(TIMELINE_SLOT_PX * zoom), [zoom]);
  const gridHeight = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * slotPx;
  const gridTemplate = `repeat(${days.length}, minmax(0, 1fr))`;

  const nowMs = useScheduleClock();
  const nowDate = new Date(nowMs);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowTop = ((nowMinutes - TIMELINE_START_HOUR * 60) / 60) * slotPx;
  const nowInRange =
    nowMinutes >= TIMELINE_START_HOUR * 60 &&
    nowMinutes <= TIMELINE_END_HOUR * 60;

  const zoomIndex = useMemo(() => {
    const idx = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
    return idx >= 0 ? idx : ZOOM_LEVELS.indexOf(DEFAULT_ZOOM);
  }, [zoom]);

  const columns = useMemo(
    () =>
      days.map((day) => {
        const dayEvents = filterEventsForDay(events, day);
        return {
          day,
          allDay: dayEvents.filter((e) => e.allDay),
          ...buildColumnLayout(
            dayEvents,
            slotPx,
            maxVisibleLanes,
            expanded,
            day,
          ),
        };
      }),
    [days, events, slotPx, maxVisibleLanes, expanded],
  );

  const hasAllDay = columns.some((c) => c.allDay.length > 0);

  const toggleCluster = (clusterKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(clusterKey)) next.delete(clusterKey);
      else next.add(clusterKey);
      return next;
    });
  };

  return (
    <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-slate-100 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setZoom(ZOOM_LEVELS[Math.max(0, zoomIndex - 1)])}
          disabled={zoomIndex === 0}
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Zoom out"
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
              ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1)],
            )
          }
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {isWeek && (
        <div className="flex shrink-0 border-b border-slate-100">
          <div className="w-12 shrink-0" />
          <div className="grid flex-1" style={{ gridTemplateColumns: gridTemplate }}>
            {days.map((day) => (
              <DayHeader
                key={day}
                day={day}
                today={today}
                selected={day === selectedDay}
                onClick={onFocusDay ? () => onFocusDay(day) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {hasAllDay && (
        <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/40">
          <div className="flex w-12 shrink-0 items-center justify-end pr-2">
            <span className="text-[9px] font-semibold uppercase text-slate-400">
              All day
            </span>
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: gridTemplate }}>
            {columns.map((col) => (
              <div
                key={col.day}
                className="min-h-[1.75rem] space-y-0.5 border-l border-slate-50 p-1 first:border-l-0"
              >
                {col.allDay.slice(0, isWeek ? 2 : 4).map((event) => {
                  const visual = deriveCalendarVisual(event.calendarId);
                  return (
                    <a
                      key={event.id}
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${event.title} · ${event.calendarName}`}
                      className={`block truncate rounded border px-1 py-0.5 text-[10px] font-semibold ${visual.box}`}
                    >
                      {event.title}
                    </a>
                  );
                })}
                {col.allDay.length > (isWeek ? 2 : 4) && (
                  <p className="px-1 text-[9px] font-semibold text-slate-400">
                    +{col.allDay.length - (isWeek ? 2 : 4)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex" style={{ minHeight: `max(${gridHeight}px, 100%)` }}>
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
            className="grid flex-1 grid-rows-1"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {columns.map((col) => (
              <div
                key={col.day}
                className="relative border-l border-slate-50 first:border-l-0"
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

                {!isWeek && col.positioned.length === 0 && (
                  <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                    No timed events
                  </p>
                )}

                {col.denseControls.map((control) => (
                  <button
                    key={control.clusterKey}
                    type="button"
                    onClick={() => toggleCluster(control.clusterKey)}
                    aria-expanded={control.expanded}
                    className="absolute right-1 z-20 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                    style={{ top: control.top }}
                  >
                    {control.expanded ? "Less" : `+${control.hiddenCount}`}
                  </button>
                ))}

                {col.positioned.map((block) => (
                  <TimeBlock key={block.event.id} block={block} />
                ))}

                {col.day === today && nowInRange && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-red-500"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
