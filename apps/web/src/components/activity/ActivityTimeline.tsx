"use client";

import { memo } from "react";
import type { ActivityEvent } from "@agent-os/platform/activity";
import {
  KIND_STYLE,
  formatTime,
  sourceLabel,
  type DayGroup,
} from "./activity-display";

const TimelineRow = memo(function TimelineRow({
  event,
  isLast,
  onUndo,
  undoing,
}: {
  event: ActivityEvent;
  isLast: boolean;
  /** Stable parent callback — the row passes its own event so memo holds. */
  onUndo: (event: ActivityEvent) => void;
  undoing: boolean;
}) {
  const style = KIND_STYLE[event.kind];

  return (
    <li className="flex gap-3">
      {/* Rail: node + connecting line down to the next row */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border ${style.box}`}
          aria-hidden
        >
          <style.Icon strokeWidth={1.8} className="h-4 w-4" />
        </div>
        {!isLast && <span className="mt-1 w-px flex-1 bg-slate-100" aria-hidden />}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium text-slate-800">
            {event.text}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {formatTime(event.timestamp)}
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span className="rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-500">
            {sourceLabel(event.source)}
          </span>
          {event.reverted && (
            <span className="font-medium text-amber-600">Reverted</span>
          )}
          {event.undoable && (
            <button
              type="button"
              onClick={() => onUndo(event)}
              disabled={undoing}
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary disabled:opacity-50"
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          )}
        </p>
      </div>
    </li>
  );
});

export function ActivityTimeline({
  groups,
  onUndo,
  undoing,
}: {
  groups: DayGroup[];
  onUndo: (event: ActivityEvent) => void;
  undoing: string | null;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <p className="app-section-label">{group.label}</p>
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-medium tabular-nums text-slate-300">
              {group.events.length}
            </span>
          </div>
          <ul>
            {group.events.map((event, i) => (
              <TimelineRow
                key={event.id}
                event={event}
                isLast={i === group.events.length - 1}
                onUndo={onUndo}
                undoing={undoing === event.id}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
