"use client";

import type { ActivityEvent } from "@/lib/activity";
import { KIND_STYLE, formatTime } from "@/components/activity/activity-display";

export function ActivityRow({
  event,
  onUndo,
  undoing,
}: {
  event: ActivityEvent;
  onUndo?: () => void;
  undoing?: boolean;
}) {
  const style = KIND_STYLE[event.kind];

  return (
    <div className="flex gap-3 border-b border-slate-50 py-2.5 last:border-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${style.box}`}
        aria-hidden
      >
        <style.Icon strokeWidth={1.8} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{event.text}</p>
        <p className="mt-0.5 text-xs text-slate-400">
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
        </p>
      </div>
    </div>
  );
}
