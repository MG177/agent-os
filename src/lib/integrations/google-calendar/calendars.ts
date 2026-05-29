import type { calendar_v3 } from "googleapis";

export interface CalendarSource {
  id: string;
  name: string;
  primary: boolean;
  backgroundColor?: string;
}

/** All calendars on the account (excludes free/busy-only access). */
export async function listAccountCalendars(
  calendar: calendar_v3.Calendar,
): Promise<CalendarSource[]> {
  const sources: CalendarSource[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.calendarList.list({
      pageToken,
      showHidden: true,
    });

    for (const item of res.data.items ?? []) {
      if (!item.id) continue;
      if (item.accessRole === "freeBusyReader") continue;

      sources.push({
        id: item.id,
        name: item.summary?.trim() || item.id,
        primary: item.primary ?? false,
        backgroundColor: item.backgroundColor ?? undefined,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return sources;
}
