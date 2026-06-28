import { Check, Salad, Smartphone, Undo2, type LucideIcon } from "lucide-react";
import type { ActivityEvent } from "@agent-os/platform/activity";
import type { AuditSource } from "@agent-os/platform/audit";

/** Icon + chip styling per activity kind. Shared by ActivityRow (Home) and the timeline. */
export const KIND_STYLE: Record<
  ActivityEvent["kind"],
  { Icon: LucideIcon; box: string }
> = {
  capture: {
    Icon: Check,
    box: "border-primary/30 bg-accent text-primary",
  },
  nutrition: {
    Icon: Salad,
    box: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  reverted: {
    Icon: Undo2,
    box: "border-amber-200 bg-amber-50 text-amber-600",
  },
  whatsapp: {
    Icon: Smartphone,
    box: "border-violet-200 bg-violet-50 text-violet-600",
  },
};

const SOURCE_META: Record<AuditSource, { label: string; bar: string }> = {
  "capture-ui": { label: "Capture", bar: "bg-primary" },
  whatsapp: { label: "WhatsApp", bar: "bg-violet-500" },
  "nutrition-form": { label: "Nutrition form", bar: "bg-emerald-500" },
  "nutrition-chat": { label: "Nutrition chat", bar: "bg-emerald-400" },
  system: { label: "System", bar: "bg-slate-400" },
};

const SOURCE_ORDER: AuditSource[] = [
  "capture-ui",
  "whatsapp",
  "nutrition-form",
  "nutrition-chat",
  "system",
];

export function sourceLabel(source?: AuditSource): string {
  return source ? SOURCE_META[source].label : "System";
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA"); // YYYY-MM-DD, local
}

function dayLabel(ts: number): string {
  const key = dayKey(ts);
  const now = Date.now();
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now - 86_400_000)) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export interface DayGroup {
  key: string;
  label: string;
  events: ActivityEvent[];
}

/** Bucket events (already sorted newest-first) into day groups, preserving order. */
export function groupByDay(events: ActivityEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const event of events) {
    const key = dayKey(event.timestamp);
    let group = index.get(key);
    if (!group) {
      group = { key, label: dayLabel(event.timestamp), events: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

export interface SourceStat {
  key: AuditSource;
  label: string;
  count: number;
  barClass: string;
}

export interface ActivityStatsData {
  total: number;
  today: number;
  captures: number;
  meals: number;
  reverted: number;
  undoable: number;
  bySource: SourceStat[];
}

/** Summary numbers for the stats rail, computed over the currently visible events. */
export function computeStats(events: ActivityEvent[]): ActivityStatsData {
  const todayKey = dayKey(Date.now());
  const sourceCounts = new Map<AuditSource, number>();
  let captures = 0;
  let meals = 0;
  let reverted = 0;
  let undoable = 0;
  let today = 0;

  for (const event of events) {
    if (event.kind === "capture" || event.kind === "whatsapp") captures += 1;
    else if (event.kind === "nutrition") meals += 1;
    else if (event.kind === "reverted") reverted += 1;
    if (event.undoable) undoable += 1;
    if (dayKey(event.timestamp) === todayKey) today += 1;
    const source = event.source ?? "system";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const bySource: SourceStat[] = SOURCE_ORDER.filter(
    (s) => (sourceCounts.get(s) ?? 0) > 0,
  ).map((s) => ({
    key: s,
    label: SOURCE_META[s].label,
    count: sourceCounts.get(s) ?? 0,
    barClass: SOURCE_META[s].bar,
  }));

  return { total: events.length, today, captures, meals, reverted, undoable, bySource };
}
