/**
 * Pure, dependency-free todo display helpers — safe in client components.
 * Single source of truth for the due-state classification shared by the
 * command-center panels and the card list.
 */

export type DueTone = "overdue" | "soon" | "scheduled";

export interface DueState {
  tone: DueTone;
  /** e.g. "6h overdue", "in 2h", "in 11h", "tomorrow" */
  label: string;
}

const SOON_MS = 2 * 60 * 60 * 1000;

/** Classify a next-run time into an urgency tone + short label, or null if no date. */
export function dueState(next: Date | undefined | null): DueState | null {
  if (!next) return null;
  const ms = next.getTime() - Date.now();

  if (ms < 0) {
    const mins = Math.round(Math.abs(ms) / 60000);
    const label = mins < 60 ? `${mins}m overdue` : `${Math.round(mins / 60)}h overdue`;
    return { tone: "overdue", label };
  }

  const mins = Math.round(ms / 60000);
  if (ms < SOON_MS) {
    const label = mins < 60 ? `in ${mins}m` : `in ${Math.round(mins / 60)}h`;
    return { tone: "soon", label };
  }

  const hours = Math.round(mins / 60);
  if (hours < 24) return { tone: "scheduled", label: `in ${hours}h` };
  const days = Math.round(hours / 24);
  return { tone: "scheduled", label: days === 1 ? "tomorrow" : `in ${days}d` };
}

const DUE_CHIP_CLASS: Record<DueTone, string> = {
  overdue: "bg-red-50 text-red-600",
  soon: "bg-amber-50 text-amber-700",
  scheduled: "bg-slate-100 text-slate-500",
};

export function dueChipClass(tone: DueTone): string {
  return DUE_CHIP_CLASS[tone];
}

/** "7:30 AM" — wall-clock time only. */
export function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
