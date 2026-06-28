"use client";

import { IconCalendar } from "@/components/ui/icons";
import {
  deriveCalendarVisual,
  formatEventTimeRange,
  formatEventTimeShort,
  isEventHappeningNow,
} from "@/components/calendar/calendar-utils";
import type { CalendarEventSummary } from "@agent-os/contracts/integrations/google-calendar/types";
import type { EventTemporalState } from "@/components/calendar/calendar-utils";

export type CalendarEventRowProps = {
  event: CalendarEventSummary;
  compact?: boolean;
  /** Home preview: minimal padding, single-line meta */
  dense?: boolean;
  showCalendar?: boolean;
  showLocation?: boolean;
  clickable?: boolean;
  showNowBadge?: boolean;
  /** Home schedule: past / now / up-next styling (overrides default Now detection). */
  temporalState?: EventTemporalState | null;
  /** Marks row for auto-scroll anchor in Home card. */
  scheduleAnchor?: boolean;
  /** Overrides default start clock (e.g. day prefix in 24h window). */
  startTimeLabel?: string;
};

export function CalendarEventRow({
  event,
  compact = false,
  dense = false,
  showCalendar = true,
  showLocation = true,
  clickable = true,
  showNowBadge = true,
  temporalState = null,
  scheduleAnchor = false,
  startTimeLabel,
}: CalendarEventRowProps) {
  const visual = deriveCalendarVisual(event.calendarId);
  const happening =
    temporalState === "now" ||
    (temporalState === null && showNowBadge && isEventHappeningNow(event));
  const isUpNext = temporalState === "next";
  const timeLabel = formatEventTimeRange(event);
  const startClock = startTimeLabel ?? formatEventTimeShort(event);

  if (dense) {
    const isPast = temporalState === "past";
    const stateClass =
      temporalState === "now"
        ? "border-l-[3px] border-emerald-500 bg-gradient-to-r from-emerald-50/90 to-white pl-2.5"
        : temporalState === "next"
          ? "bg-accent/40"
          : isPast
            ? "opacity-45"
            : "";

    const rowClass = `flex items-center gap-2 border-b border-slate-50 px-3 py-1.5 last:border-0 ${stateClass} ${clickable && event.htmlLink
      ? "cursor-pointer hover:bg-slate-50/80"
      : ""
      }`;

    const content = (
      <>
        <span
          className={`min-w-[3.25rem] shrink-0 text-[10px] font-semibold tabular-nums leading-tight ${isPast ? "text-slate-400" : "text-slate-500"}`}
        >
          {event.allDay ? "All day" : startClock}
        </span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${visual.dot}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-xs font-medium ${isPast ? "text-slate-400" : "text-slate-800"}`}
          >
            {event.title}
            {happening && (
              <span className="ml-1.5 rounded bg-emerald-50 px-1 py-px text-[10px] font-bold uppercase text-emerald-700">
                Now
              </span>
            )}
            {isUpNext && (
              <span className="ml-1.5 rounded bg-accent px-1 py-px text-[10px] font-bold uppercase text-primary">
                Up next
              </span>
            )}
          </p>
          <p className="truncate text-[10px] text-slate-400">
            {event.allDay ? event.calendarName : `${timeLabel} · ${event.calendarName}`}
          </p>
        </div>
      </>
    );

    const anchorProps = scheduleAnchor
      ? { "data-schedule-anchor": "true" as const }
      : {};

    if (clickable && event.htmlLink) {
      return (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className={rowClass}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }
    return (
      <div className={rowClass} {...anchorProps}>
        {content}
      </div>
    );
  }

  const isPast = temporalState === "past";
  const stateClass =
    temporalState === "now"
      ? "border-l-[3px] border-emerald-500 bg-gradient-to-r from-emerald-50/90 to-white pl-2"
      : temporalState === "next"
        ? "bg-accent/40"
        : isPast
          ? "opacity-45"
          : "";

  const inner = (
    <>
      <div
        className={`flex shrink-0 flex-col items-center justify-center text-center tabular-nums ${compact ? "w-12" : "w-14"
          }`}
      >
        {event.allDay ? (
          <span className="text-[10px] font-semibold leading-tight text-slate-500">
            All
            {!compact && (
              <>
                <br />
                day
              </>
            )}
          </span>
        ) : (
          <>
            <span className="text-xs font-semibold leading-tight text-slate-600">
              {startClock}
            </span>
            {!compact && timeLabel.includes("–") && (
              <span className="text-[10px] leading-tight text-slate-400">
                {timeLabel.split("–")[1]?.trim()}
              </span>
            )}
          </>
        )}
      </div>

      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border ${visual.box}`}
        aria-hidden
      >
        <IconCalendar className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-800">{event.title}</p>
          {happening && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Now
            </span>
          )}
          {isUpNext && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Up next
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {compact ? formatEventTimeRange(event) : timeLabel}
        </p>
        {(showCalendar || (showLocation && event.location)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showCalendar && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${visual.box}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} />
                {event.calendarName}
              </span>
            )}
            {showLocation && event.location && (
              <span className="truncate text-[10px] text-slate-500">
                {event.location}
              </span>
            )}
          </div>
        )}
      </div>

      {event.htmlLink && !compact && (
        <span className="shrink-0 self-center text-xs font-semibold text-primary">
          Open
        </span>
      )}
    </>
  );

  const rowClass = `flex gap-3 border-b border-slate-50 py-3 last:border-0 transition-colors ${stateClass} ${clickable && event.htmlLink
    ? "cursor-pointer hover:bg-slate-50/80"
    : ""
    }`;

  if (clickable && event.htmlLink) {
    return (
      <a
        href={event.htmlLink}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClass}
      >
        {inner}
      </a>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}

export {
  groupEventsByDay,
  formatEventDayLabel,
  sortEventsWithinDay,
} from "@/components/calendar/calendar-utils";
