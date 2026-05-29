"use client";

import type { ActivityEvent } from "@/lib/activity";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const KIND_STYLE: Record<
  ActivityEvent["kind"],
  { icon: string; box: string }
> = {
  capture: {
    icon: "✓",
    box: "border-blue-200 bg-blue-50 text-blue-600",
  },
  nutrition: {
    icon: "🥗",
    box: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  reverted: {
    icon: "↩",
    box: "border-amber-200 bg-amber-50 text-amber-600",
  },
  whatsapp: {
    icon: "📱",
    box: "border-violet-200 bg-violet-50 text-violet-600",
  },
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
  const style = KIND_STYLE[event.kind];

  return (
    <div className="flex gap-3 border-b border-slate-50 py-3 last:border-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm ${style.box}`}
        aria-hidden
      >
        {style.icon}
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
