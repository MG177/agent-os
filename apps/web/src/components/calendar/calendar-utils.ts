import type { CalendarEventSummary } from "@agent-os/contracts/integrations/google-calendar/types";

export type DayGroup = {
  day: string;
  label: string;
  events: CalendarEventSummary[];
};

// Categorical palette hashed to calendars — 6 distinct hues, none of them the
// brand accent (so an event chip never reads as a primary action).
const CALENDAR_ACCENTS = [
  { box: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  { box: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { box: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { box: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  { box: "border-cyan-200 bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  { box: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
] as const;

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function localDateKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

export function formatEventDayLabel(iso: string): string {
  const key = dayKey(iso);
  const todayKey = localDateKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";

  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatEventTimeRange(event: CalendarEventSummary): string {
  if (event.allDay) return "All day";

  const start = new Date(event.start);
  const end = new Date(event.end);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const startStr = start.toLocaleTimeString("en-GB", opts);
  if (event.end && end.getTime() !== start.getTime()) {
    const endStr = end.toLocaleTimeString("en-GB", opts);
    return `${startStr} – ${endStr}`;
  }
  return startStr;
}

export function formatEventTimeShort(event: CalendarEventSummary): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortEventsWithinDay(
  events: CalendarEventSummary[],
): CalendarEventSummary[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    const aKey = a.allDay ? a.start : a.start;
    const bKey = b.allDay ? b.start : b.start;
    return aKey.localeCompare(bKey);
  });
}

export function deriveCalendarVisual(calendarId: string) {
  let hash = 0;
  for (let i = 0; i < calendarId.length; i++) {
    hash = (hash + calendarId.charCodeAt(i)) % 997;
  }
  return CALENDAR_ACCENTS[hash % CALENDAR_ACCENTS.length];
}

export function groupEventsByDay(events: CalendarEventSummary[]): DayGroup[] {
  const map = new Map<string, CalendarEventSummary[]>();
  for (const event of events) {
    const key = dayKey(event.start);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayEvents]) => ({
      day,
      label: formatEventDayLabel(dayEvents[0]?.start ?? day),
      events: sortEventsWithinDay(dayEvents),
    }));
}

export function buildWeekDayKeys(groups: DayGroup[]): DayGroup[] {
  const today = localDateKey();
  const keys: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + i);
    keys.push(d.toLocaleDateString("en-CA"));
  }

  const byDay = new Map(groups.map((g) => [g.day, g]));

  return keys.map((day) => {
    const existing = byDay.get(day);
    if (existing) return existing;
    return {
      day,
      label: formatEventDayLabel(day),
      events: [],
    };
  });
}

export function filterEventsForDay(
  events: CalendarEventSummary[],
  day: string,
): CalendarEventSummary[] {
  return sortEventsWithinDay(events.filter((e) => dayKey(e.start) === day));
}

export function countEventsToday(events: CalendarEventSummary[]): number {
  const today = localDateKey();
  return events.filter((e) => dayKey(e.start) === today).length;
}

export function findNextEvent(
  events: CalendarEventSummary[],
): CalendarEventSummary | null {
  const now = Date.now();
  const sorted = [...events].sort((a, b) => eventStartMs(a) - eventStartMs(b));
  return sorted.find((e) => eventEndMs(e) >= now) ?? null;
}

export function isEventHappeningNow(event: CalendarEventSummary): boolean {
  const now = Date.now();
  const start = new Date(
    event.start.includes("T") ? event.start : `${event.start}T00:00:00`,
  ).getTime();
  const end = new Date(
    event.end.includes("T") ? event.end : `${event.end}T23:59:59`,
  ).getTime();
  return now >= start && now <= end;
}

export function isEventPast(
  event: CalendarEventSummary,
  now = Date.now(),
): boolean {
  return now >= eventEndMs(event);
}

/** Timed events use an exclusive end boundary for “now” / “past”. */
export function isTimedEventHappeningNow(
  event: CalendarEventSummary,
  now = Date.now(),
): boolean {
  if (event.allDay) return false;
  return now >= eventStartMs(event) && now < eventEndMs(event);
}

export function findHappeningTimedEvent(
  events: CalendarEventSummary[],
  now = Date.now(),
): CalendarEventSummary | null {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => eventStartMs(a) - eventStartMs(b));
  return timed.find((e) => isTimedEventHappeningNow(e, now)) ?? null;
}

export function findNextTimedEvent(
  events: CalendarEventSummary[],
  now = Date.now(),
): CalendarEventSummary | null {
  const timed = events
    .filter((e) => !e.allDay)
    .sort((a, b) => eventStartMs(a) - eventStartMs(b));
  return timed.find((e) => eventStartMs(e) > now) ?? null;
}

export type EventTemporalState = "past" | "now" | "next";

export function getTimedEventTemporalState(
  event: CalendarEventSummary,
  nextEventId: string | null,
  now = Date.now(),
): EventTemporalState | null {
  if (event.allDay) return null;
  if (isTimedEventHappeningNow(event, now)) return "now";
  if (isEventPast(event, now)) return "past";
  if (nextEventId && event.id === nextEventId) return "next";
  return null;
}

export const HOME_SCHEDULE_WINDOW_AHEAD = 5;
export const HOME_SCHEDULE_CONTEXT_PAST = 1;

/** Home schedule Gantt span (rolling, centered on now). */
export const HOME_24H_WINDOW_MS = 24 * 60 * 60 * 1000;

export function minutesFromTimestamp(now: number): number {
  const d = new Date(now);
  return d.getHours() * 60 + d.getMinutes();
}

export function formatMinutesClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type Home24HourWindow = {
  winStartMs: number;
  winEndMs: number;
  spanMs: number;
  nowMs: number;
};

/** Rolling 24h timeline: 12h before now through 12h after (crosses calendar days). */
export function buildHome24HourWindow(now: number): Home24HourWindow {
  const half = HOME_24H_WINDOW_MS / 2;
  return {
    winStartMs: now - half,
    winEndMs: now + half,
    spanMs: HOME_24H_WINDOW_MS,
    nowMs: now,
  };
}

export function eventStartMs(event: CalendarEventSummary): number {
  return new Date(
    event.start.includes("T") ? event.start : `${event.start}T00:00:00`,
  ).getTime();
}

export function eventEndMs(event: CalendarEventSummary): number {
  return new Date(
    event.end.includes("T") ? event.end : `${event.end}T23:59:59`,
  ).getTime();
}

export function eventIntersectsWindow(
  event: CalendarEventSummary,
  winStartMs: number,
  winEndMs: number,
): boolean {
  return eventEndMs(event) > winStartMs && eventStartMs(event) < winEndMs;
}

export function formatHomeScheduleWindowLabel(
  winStartMs: number,
  winEndMs: number,
): string {
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const start = new Date(winStartMs);
  const end = new Date(winEndMs);
  const startDay = start.toLocaleDateString("en-CA");
  const endDay = end.toLocaleDateString("en-CA");
  const startTime = start.toLocaleTimeString("en-GB", timeOpts);
  const endTime = end.toLocaleTimeString("en-GB", timeOpts);

  if (startDay === endDay) {
    const day = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return `${day} · ${startTime} – ${endTime}`;
  }

  const fmt: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return `${start.toLocaleString("en-US", fmt)} – ${end.toLocaleString("en-US", fmt)}`;
}

export function formatTimelineTick(
  ms: number,
  anchorDayKey: string,
): string {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (d.toLocaleDateString("en-CA") === anchorDayKey) return time;
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}

export type HomeScheduleWindow = {
  allDay: CalendarEventSummary[];
  visibleTimed: CalendarEventSummary[];
  nextEventId: string | null;
  moreCount: number;
  scrollAnchorId: string | null;
};

export function buildHomeScheduleWindow(
  events: CalendarEventSummary[],
  options?: { showContextPast?: boolean; now?: number },
): HomeScheduleWindow {
  const now = options?.now ?? Date.now();
  const showContext = options?.showContextPast ?? true;
  const sorted = sortEventsWithinDay(events);
  const allDay = sorted.filter((e) => e.allDay);
  const timed = sorted.filter((e) => !e.allDay);

  const nowEv = findHappeningTimedEvent(timed, now);
  const nextEv = findNextTimedEvent(timed, now);

  let focusIdx = timed.length;
  if (nowEv) focusIdx = timed.indexOf(nowEv);
  else if (nextEv) focusIdx = timed.indexOf(nextEv);

  const startIdx = Math.max(
    0,
    focusIdx - (showContext ? HOME_SCHEDULE_CONTEXT_PAST : 0),
  );
  const endIdx = Math.min(
    timed.length,
    (nowEv ? focusIdx + 1 : focusIdx) + HOME_SCHEDULE_WINDOW_AHEAD,
  );

  const visibleTimed = timed.slice(startIdx, endIdx);
  const moreCount = Math.max(0, timed.length - visibleTimed.length);
  const scrollAnchorId = nowEv?.id ?? nextEv?.id ?? null;

  return {
    allDay,
    visibleTimed,
    nextEventId: nextEv?.id ?? null,
    moreCount,
    scrollAnchorId,
  };
}

/** Minutes from midnight for timed events (local). */
export function eventStartMinutes(event: CalendarEventSummary): number {
  if (event.allDay) return 0;
  const d = new Date(event.start);
  return d.getHours() * 60 + d.getMinutes();
}

export function eventDurationMinutes(event: CalendarEventSummary): number {
  if (event.allDay) return 24 * 60;
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  const mins = Math.max(30, Math.round((end - start) / 60_000));
  return Math.min(mins, 12 * 60);
}

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 24;
export const TIMELINE_SLOT_PX = 48;

export type CalendarSource = {
  id: string;
  name: string;
};

export function deriveCalendarsFromEvents(
  events: CalendarEventSummary[],
): CalendarSource[] {
  const map = new Map<string, string>();
  for (const event of events) {
    if (!map.has(event.calendarId)) {
      map.set(event.calendarId, event.calendarName);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function filterEventsByVisibleCalendars(
  events: CalendarEventSummary[],
  hiddenCalendarIds: ReadonlySet<string>,
): CalendarEventSummary[] {
  if (hiddenCalendarIds.size === 0) return events;
  return events.filter((e) => !hiddenCalendarIds.has(e.calendarId));
}

export function formatSelectedDaySubtitle(
  label: string,
  eventCount: number,
): string {
  const noun = eventCount === 1 ? "event" : "events";
  return `${label} · ${eventCount} ${noun}`;
}

/* ------------------------------------------------------------------ */
/* Week / month grid helpers                                          */
/* ------------------------------------------------------------------ */

export const INDONESIA_HOLIDAY_CALENDAR = "hari libur di indonesia";

/** Add `days` to a `YYYY-MM-DD` key, returning a local day key. */
export function addDaysToKey(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/** Add `months` to a `YYYY-MM-DD` key, returning a local day key. */
export function addMonthsToKey(dayKey: string, months: number): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-CA");
}

/** First day of the month for a day key (`YYYY-MM-01`). */
export function startOfMonthKey(dayKey: string): string {
  return `${dayKey.slice(0, 7)}-01`;
}

/** Monday of the week containing `dayKey`. */
export function startOfWeekKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  const offset = (d.getDay() + 6) % 7; // 0 = Monday
  return addDaysToKey(dayKey, -offset);
}

/** 7 consecutive day keys starting at `weekStartKey` (Mon → Sun). */
export function buildWeekKeys(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStartKey, i));
}

export type MonthGridCell = { day: string; inMonth: boolean };

/** 6×7 month grid (Mon-start) covering the month containing `anchorDayKey`. */
export function buildMonthGridKeys(anchorDayKey: string): MonthGridCell[] {
  const month = anchorDayKey.slice(0, 7);
  const gridStart = startOfWeekKey(startOfMonthKey(anchorDayKey));
  return Array.from({ length: 42 }, (_, i) => {
    const day = addDaysToKey(gridStart, i);
    return { day, inMonth: day.slice(0, 7) === month };
  });
}

export function isWeekendDayKey(dayKey: string): boolean {
  const dow = new Date(`${dayKey}T12:00:00`).getDay();
  return dow === 0 || dow === 6;
}

export function dayHasHoliday(events: CalendarEventSummary[]): boolean {
  return events.some(
    (event) =>
      event.calendarName.trim().toLowerCase() === INDONESIA_HOLIDAY_CALENDAR,
  );
}

export function formatMonthLabel(dayKey: string): string {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekRangeLabel(weekStartKey: string): string {
  const start = new Date(`${weekStartKey}T12:00:00`);
  const endKey = addDaysToKey(weekStartKey, 6);
  const end = new Date(`${endKey}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" },
  );
  return `${startStr} – ${endStr}`;
}

/* ------------------------------------------------------------------ */
/* Shared timed-event layout (timeline + week grid)                   */
/* ------------------------------------------------------------------ */

export type LaidOutTimedEvent = {
  event: CalendarEventSummary;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  lane: number;
};

export type TimedEventCluster = {
  id: string;
  items: LaidOutTimedEvent[];
  laneCount: number;
  startTop: number;
  endTop: number;
};

/**
 * Position timed events on a vertical day axis and assign collision lanes.
 * Pure geometry shared by the day Timeline and the Week grid columns.
 */
export function clusterTimedEvents(
  timed: CalendarEventSummary[],
  slotPx: number,
  opts: { minHeight: number },
): TimedEventCluster[] {
  const maxTop = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * slotPx;
  const base = timed
    .map((event) => {
      const startMin = eventStartMinutes(event);
      const endMin = startMin + eventDurationMinutes(event);
      const rawTop = ((startMin - TIMELINE_START_HOUR * 60) / 60) * slotPx;
      const rawHeight = Math.max(
        (eventDurationMinutes(event) / 60) * slotPx,
        opts.minHeight,
      );
      const rawBottom = rawTop + rawHeight;
      if (rawBottom <= 0 || rawTop >= maxTop) return null;
      const top = Math.max(0, rawTop);
      const bottom = Math.min(maxTop, rawBottom);
      const height = Math.max(opts.minHeight, bottom - top);
      return { event, startMin, endMin, top, height };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const raw: Array<{
    id: string;
    items: typeof base;
    maxEndMin: number;
    startTop: number;
    endTop: number;
  }> = [];

  base.forEach((item) => {
    const current = raw.at(-1);
    if (!current || item.startMin >= current.maxEndMin) {
      raw.push({
        id: `${item.startMin}-${item.endMin}-${raw.length}`,
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

  return raw.map((cluster) => {
    const laneEndMins: number[] = [];
    const items = cluster.items.map((item) => {
      let lane = laneEndMins.findIndex((endMin) => item.startMin >= endMin);
      if (lane === -1) {
        lane = laneEndMins.length;
        laneEndMins.push(item.endMin);
      } else {
        laneEndMins[lane] = item.endMin;
      }
      return { ...item, lane };
    });
    return {
      id: cluster.id,
      items,
      laneCount: laneEndMins.length,
      startTop: cluster.startTop,
      endTop: cluster.endTop,
    };
  });
}
