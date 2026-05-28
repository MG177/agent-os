import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

export type DayGroup = {
  day: string;
  label: string;
  events: CalendarEventSummary[];
};

const CALENDAR_ACCENTS = [
  { box: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  { box: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { box: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { box: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  { box: "border-indigo-200 bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
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

function eventStartMs(event: CalendarEventSummary): number {
  return new Date(
    event.start.includes("T") ? event.start : `${event.start}T00:00:00`,
  ).getTime();
}

function eventEndMs(event: CalendarEventSummary): number {
  return new Date(
    event.end.includes("T") ? event.end : `${event.end}T23:59:59`,
  ).getTime();
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

export const HOME_SCHEDULE_WINDOW_AHEAD = 3;
export const HOME_SCHEDULE_CONTEXT_PAST = 1;

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
export const TIMELINE_END_HOUR = 22;
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
