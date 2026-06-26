/** Fixed ClickUp priority scale (1 = Urgent … 4 = Low). */
export const PRIORITY_OPTIONS = [
  { level: 1, key: "urgent", label: "Urgent", color: "#ef4444" },
  { level: 2, key: "high", label: "High", color: "#f97316" },
  { level: 3, key: "normal", label: "Normal", color: "#3b82f6" },
  { level: 4, key: "low", label: "Low", color: "#94a3b8" },
] as const;

export function priorityLevel(key: string | undefined | null): number | null {
  if (!key) return null;
  return PRIORITY_OPTIONS.find((p) => p.key === key)?.level ?? null;
}

export type DueTone = "overdue" | "today" | "soon" | "none";

export interface DueLabel {
  label: string;
  tone: DueTone;
}

/** Human due-date label + tone, relative to the browser's local day. */
export function formatDue(dueMs: number | null): DueLabel | null {
  if (dueMs == null) return null;
  const due = new Date(dueMs);
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startDue = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate(),
  ).getTime();
  const dayDiff = Math.round((startDue - startToday) / 86_400_000);
  const monthDay = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (dayDiff < 0) {
    return { label: dayDiff === -1 ? "Yesterday" : monthDay, tone: "overdue" };
  }
  if (dayDiff === 0) return { label: "Today", tone: "today" };
  if (dayDiff === 1) return { label: "Tomorrow", tone: "soon" };
  return { label: monthDay, tone: "none" };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  overdue: "text-red-600",
  today: "text-amber-600",
  soon: "text-slate-500",
  none: "text-slate-400",
};

/** Elapsed timer label, e.g. 1:04:09 or 4:09. */
export function formatElapsed(startMs: number, now: number): string {
  const totalSec = Math.max(0, Math.floor((now - startMs) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Convert a yyyy-mm-dd input value to epoch ms at local midnight, or null. */
export function dateInputToMs(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}
