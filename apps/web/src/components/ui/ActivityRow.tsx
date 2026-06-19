"use client";

import type { ActivityEvent } from "@/lib/activity";
import { formatTime } from "@/components/activity/activity-display";

const DOT_COLOR: Record<ActivityEvent["kind"], string> = {
  capture:   "bg-blue-500",
  nutrition: "bg-emerald-500",
  reverted:  "bg-amber-500",
  whatsapp:  "bg-violet-500",
};

export function ActivityRow({
  event,
  onUndo,
  undoing,
}: {
  event: ActivityEvent;
  onUndo?: () => void;
  undoing?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-slate-50 py-1.5 last:border-0">
      <div
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[event.kind]}`}
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
        {event.text}
      </p>
      <span className="shrink-0 text-[11px] text-slate-400">
        {formatTime(event.timestamp)}
        {event.undoable && onUndo && (
          <>
            {" · "}
            <button
              type="button"
              onClick={onUndo}
              disabled={undoing}
              className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700 disabled:opacity-50"
            >
              {undoing ? "Undoing…" : "Undo"}
            </button>
          </>
        )}
      </span>
    </div>
  );
}
