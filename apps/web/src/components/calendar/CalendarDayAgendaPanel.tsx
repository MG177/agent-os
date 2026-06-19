"use client";

import { CalendarEventRow } from "@/components/calendar/CalendarEventRow";
import {
  findNextTimedEvent,
  getTimedEventTemporalState,
  sortEventsWithinDay,
} from "@/components/calendar/calendar-utils";
import type { DayGroup } from "@/components/calendar/calendar-utils";

export function CalendarDayAgendaPanel({
  group,
  nowMs,
}: {
  group: DayGroup;
  nowMs: number;
}) {
  const events = sortEventsWithinDay(group.events);
  const timed = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const nextEventId = findNextTimedEvent(timed, nowMs)?.id ?? null;

  if (!events.length) {
    return (
      <p className="px-5 py-12 text-center text-sm text-slate-400">
        No events this day
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-50 px-5 py-2">
      {allDay.length > 0 && (
        <div className="border-b border-slate-100 pb-2">
          <p className="pb-1 pt-1 app-section-label">
            All day
          </p>
          {allDay.map((event) => (
            <CalendarEventRow
              key={event.id}
              event={event}
              showNowBadge={false}
              temporalState={null}
            />
          ))}
        </div>
      )}
      {timed.map((event) => (
        <CalendarEventRow
          key={event.id}
          event={event}
          temporalState={getTimedEventTemporalState(
            event,
            nextEventId,
            nowMs,
          )}
          showNowBadge={false}
        />
      ))}
    </div>
  );
}
