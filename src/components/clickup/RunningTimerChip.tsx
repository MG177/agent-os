"use client";

import { Loader2, Square } from "lucide-react";
import { formatElapsed } from "@/components/clickup/clickup-format";
import type { ClickUpTimeEntry } from "@/components/clickup/types";

/** Header chip showing the active ClickUp timer with a stop control. */
export function RunningTimerChip({
  entry,
  now,
  busy,
  onStop,
}: {
  entry: ClickUpTimeEntry | null;
  now: number;
  busy: boolean;
  onStop: () => void;
}) {
  if (!entry) return null;
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      <span className="tabular-nums">{formatElapsed(entry.start, now)}</span>
      {entry.taskName && (
        <span className="hidden max-w-[10rem] truncate font-medium text-emerald-600/80 sm:inline">
          {entry.taskName}
        </span>
      )}
      <button
        type="button"
        onClick={onStop}
        disabled={busy}
        aria-label="Stop timer"
        className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Square className="h-3 w-3 fill-current" />
        )}
      </button>
    </div>
  );
}
