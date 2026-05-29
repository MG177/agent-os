"use client";

import { CalendarEventRow } from "@/components/calendar/CalendarEventRow";
import type { DayGroup } from "@/components/calendar/calendar-utils";

export function CalendarAgendaPanel({ groups }: { groups: DayGroup[] }) {
  if (!groups.length) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        No events in the next 7 days
      </p>
    );
  }

  return (
    <div className="app-card flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-1 py-1">
          {groups.map((group) => (
            <section key={group.day} className="border-b border-slate-50 last:border-0">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-100 bg-white/95 px-5 py-2.5 backdrop-blur-sm">
                <p className="app-section-label">{group.label}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {group.events.length} event
                  {group.events.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="divide-y divide-slate-50 px-5">
                {group.events.length ? (
                  group.events.map((event) => (
                    <CalendarEventRow key={event.id} event={event} />
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No events
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
