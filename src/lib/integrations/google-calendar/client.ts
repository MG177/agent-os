import { google } from "googleapis";
import { listAccountCalendars } from "@/lib/integrations/google-calendar/calendars";
import {
  getCachedEvents,
  setCachedEvents,
} from "@/lib/integrations/google-calendar/cache";
import { resolveRedirectUri } from "@/lib/integrations/google-calendar/config";
import { getAuthenticatedClient } from "@/lib/integrations/google-calendar/oauth";
import { getRefreshToken } from "@/lib/integrations/google-calendar/store";
import type { CalendarEventSummary } from "@/lib/integrations/google-calendar/types";

function getTimeZone(): string {
  return process.env.TZ || "Asia/Jakarta";
}

function startOfDayIso(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}T00:00:00`;
}

function addDaysIso(isoDate: string, days: number, tz: string): string {
  const base = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  base.setDate(base.getDate() + days);
  return startOfDayIso(base, tz);
}

function tzOffsetMinutes(timeZone: string, probe: Date): number {
  const utc = Date.parse(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = Date.parse(probe.toLocaleString("en-US", { timeZone }));
  return Math.round((zoned - utc) / 60_000);
}

/** RFC3339 boundary for Google Calendar API using app TZ. */
function toApiTime(isoLocal: string, timeZone: string): string {
  const ymd = isoLocal.slice(0, 10);
  const time = isoLocal.includes("T") ? isoLocal.slice(11, 19) : "00:00:00";
  const mins = tzOffsetMinutes(timeZone, new Date(`${ymd}T12:00:00`));
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${ymd}T${time}${sign}${hh}:${mm}`;
}

export function resolveEventRange(
  range: string | null,
  fromParam: string | null,
  toParam: string | null,
): { timeMin: string; timeMax: string; timeZone: string } {
  const tz = getTimeZone();
  const now = new Date();

  if (fromParam && toParam) {
    return {
      timeMin: fromParam,
      timeMax: toParam,
      timeZone: tz,
    };
  }

  const todayStart = startOfDayIso(now, tz);

  if (range === "today") {
    const tomorrow = addDaysIso(todayStart, 1, tz);
    return { timeMin: todayStart, timeMax: tomorrow, timeZone: tz };
  }

  if (range === "14days") {
    const twoWeeksEnd = addDaysIso(todayStart, 14, tz);
    return { timeMin: todayStart, timeMax: twoWeeksEnd, timeZone: tz };
  }

  const weekEnd = addDaysIso(todayStart, 8, tz);
  return { timeMin: todayStart, timeMax: weekEnd, timeZone: tz };
}

function normalizeEvent(
  item: {
    id?: string | null;
    summary?: string | null;
    start?: { date?: string | null; dateTime?: string | null };
    end?: { date?: string | null; dateTime?: string | null };
    location?: string | null;
    htmlLink?: string | null;
  },
  calendarId: string,
  calendarName: string,
): CalendarEventSummary | null {
  if (!item.id) return null;
  const startRaw = item.start?.dateTime ?? item.start?.date;
  const endRaw = item.end?.dateTime ?? item.end?.date;
  if (!startRaw) return null;

  const allDay = Boolean(item.start?.date && !item.start?.dateTime);

  return {
    id: `${calendarId}:${item.id}`,
    title: item.summary?.trim() || "(No title)",
    start: startRaw,
    end: endRaw ?? startRaw,
    allDay,
    calendarId,
    calendarName,
    location: item.location ?? undefined,
    htmlLink: item.htmlLink ?? undefined,
  };
}

function compareByStart(a: CalendarEventSummary, b: CalendarEventSummary): number {
  const aKey = a.allDay ? `${a.start}T00:00:00` : a.start;
  const bKey = b.allDay ? `${b.start}T00:00:00` : b.start;
  return aKey.localeCompare(bKey);
}

async function listEventsForCalendar(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  calendarName: string,
  timeMin: string,
  timeMax: string,
  timeZone: string,
): Promise<CalendarEventSummary[]> {
  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
    timeZone,
  });

  return (res.data.items ?? [])
    .map((item) => normalizeEvent(item, calendarId, calendarName))
    .filter((e): e is CalendarEventSummary => e !== null);
}

export async function listCalendarEvents(
  request: Request,
  options: {
    range?: string | null;
    from?: string | null;
    to?: string | null;
    skipCache?: boolean;
  },
): Promise<CalendarEventSummary[]> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new CalendarNotConnectedError();
  }

  const { timeMin, timeMax, timeZone } = resolveEventRange(
    options.range ?? "week",
    options.from ?? null,
    options.to ?? null,
  );

  const cacheKey = `all|${timeMin}|${timeMax}|${timeZone}`;
  if (!options.skipCache) {
    const cached = getCachedEvents(cacheKey);
    if (cached) return cached;
  }

  const redirectUri = resolveRedirectUri(request);
  const auth = getAuthenticatedClient(redirectUri, refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const apiTimeMin = toApiTime(timeMin, timeZone);
  const apiTimeMax = toApiTime(timeMax, timeZone);

  const sources = await listAccountCalendars(calendar);
  if (!sources.length) {
    return [];
  }

  const results = await Promise.allSettled(
    sources.map((source) =>
      listEventsForCalendar(
        calendar,
        source.id,
        source.name,
        apiTimeMin,
        apiTimeMax,
        timeZone,
      ),
    ),
  );

  const merged: CalendarEventSummary[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    }
  }

  merged.sort(compareByStart);

  setCachedEvents(cacheKey, merged);
  return merged;
}

export class CalendarNotConnectedError extends Error {
  constructor() {
    super("Google Calendar is not connected");
    this.name = "CalendarNotConnectedError";
  }
}

export async function listTodayEvents(
  request: Request,
): Promise<CalendarEventSummary[]> {
  return listCalendarEvents(request, { range: "today" });
}
