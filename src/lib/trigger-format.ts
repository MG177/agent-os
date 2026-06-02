/**
 * Pure, dependency-free trigger helpers — safe to import in client components.
 *
 * Keep this module free of `cron-parser` (and any node-only deps) so bundlers
 * never pull that into the browser. The authoritative server-side next-run is
 * computed in `cron-parse.ts` via cron-parser; `nextTriggerRun` here is a
 * lightweight client preview over the same cron strings.
 */

export interface TriggerDoc {
  id: string;
  type: "hourly" | "daily" | "weekly" | "monthly" | "cron";
  // hourly
  hourlyInterval?: number; // 1–24
  // daily
  dailyHour?: number; // 0–23
  dailyMinute?: number; // 0, 15, 30, 45
  // weekly
  weeklyDays?: number[]; // 0=Sun … 6=Sat
  weeklyHour?: number;
  weeklyMinute?: number;
  // monthly
  monthlyDay?: number; // 1–31
  monthlyHour?: number;
  monthlyMinute?: number;
  // custom
  cronExpr?: string;
  // computed — always stored server-side
  label: string;
  nextRunAt?: Date;
}

export const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatHour12(h: number, m = 0): string {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  return `${display}:${mm} ${suffix}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function triggerToCronExpr(t: TriggerDoc): string {
  const h = (x?: number) => x ?? 9;
  const m = (x?: number) => x ?? 0;
  switch (t.type) {
    case "hourly": {
      const n = t.hourlyInterval ?? 1;
      return n === 1 ? "0 * * * *" : `0 */${n} * * *`;
    }
    case "daily":
      return `${m(t.dailyMinute)} ${h(t.dailyHour)} * * *`;
    case "weekly": {
      const days = (t.weeklyDays ?? [1]).slice().sort((a, b) => a - b).join(",");
      return `${m(t.weeklyMinute)} ${h(t.weeklyHour)} * * ${days}`;
    }
    case "monthly":
      return `${m(t.monthlyMinute)} ${h(t.monthlyHour)} ${t.monthlyDay ?? 1} * *`;
    case "cron":
      return t.cronExpr ?? "0 9 * * *";
  }
}

export function triggerToLabel(t: TriggerDoc): string {
  const h = (x?: number) => x ?? 9;
  const m = (x?: number) => x ?? 0;
  switch (t.type) {
    case "hourly": {
      const n = t.hourlyInterval ?? 1;
      return n === 1 ? "Every hour" : `Every ${n} hours`;
    }
    case "daily":
      return `Daily at ${formatHour12(h(t.dailyHour), m(t.dailyMinute))}`;
    case "weekly": {
      const days = (t.weeklyDays ?? [1])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_ABBR[d])
        .join(" & ");
      return `${days} at ${formatHour12(h(t.weeklyHour), m(t.weeklyMinute))}`;
    }
    case "monthly":
      return `${ordinal(t.monthlyDay ?? 1)} of month at ${formatHour12(h(t.monthlyHour), m(t.monthlyMinute))}`;
    case "cron":
      return t.cronExpr ?? "";
  }
}

// ── Lightweight client-side cron next-occurrence (preview only) ─────────

function parseField(field: string, min: number, max: number): Set<number> {
  const set = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) set.add(i);
    } else if (part.startsWith("*/")) {
      const step = Number(part.slice(2));
      if (step > 0) for (let i = min; i <= max; i += step) set.add(i);
    } else if (part.includes("-")) {
      let [a, b] = part.split("-");
      let step = 1;
      if (b?.includes("/")) {
        const x = b.split("/");
        b = x[0];
        step = Number(x[1]);
      }
      const start = Number(a);
      const end = Number(b);
      if (step > 0) for (let i = start; i <= end; i += step) set.add(i);
    } else {
      const n = Number(part);
      if (!Number.isNaN(n)) set.add(n);
    }
  }
  return set;
}

/** Next occurrence of a 5-field cron expression, or null if unparseable / none within a year. */
export function nextCronClient(expr: string, from: Date = new Date()): Date | null {
  const p = expr.trim().split(/\s+/);
  if (p.length !== 5) return null;
  const [mn, hr, dom, mon, dow] = p;
  const M = parseField(mn, 0, 59);
  const H = parseField(hr, 0, 23);
  const DOM = parseField(dom, 1, 31);
  const MON = parseField(mon, 1, 12);
  const DOW = parseField(dow, 0, 7);
  if (DOW.has(7)) DOW.add(0);
  const domR = dom !== "*";
  const dowR = dow !== "*";

  const d = new Date(from.getTime() + 60_000);
  d.setSeconds(0, 0);
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (M.has(d.getMinutes()) && H.has(d.getHours()) && MON.has(d.getMonth() + 1)) {
      const domOk = DOM.has(d.getDate());
      const dowOk = DOW.has(d.getDay());
      let dayOk: boolean;
      if (domR && dowR) dayOk = domOk || dowOk;
      else if (domR) dayOk = domOk;
      else if (dowR) dayOk = dowOk;
      else dayOk = true;
      if (dayOk) return new Date(d);
    }
    d.setTime(d.getTime() + 60_000);
  }
  return null;
}

/** Client preview of a trigger's next fire time. Returns null for an incomplete weekly/cron trigger. */
export function nextTriggerRun(t: TriggerDoc, from: Date = new Date()): Date | null {
  if (t.type === "weekly" && !(t.weeklyDays && t.weeklyDays.length)) return null;
  if (t.type === "cron" && !t.cronExpr?.trim()) return null;
  return nextCronClient(triggerToCronExpr(t), from);
}

/** Compact relative label for the "Next" column: "5 PM", "Tmrw 8 AM", "Fri 8 AM", "Jul 1". */
export function formatNextShort(d: Date | null): string {
  if (!d) return "—";
  const now = new Date();
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  const time = formatHour12(d.getHours(), d.getMinutes()).replace(":00", "");
  if (days === 0) return time;
  if (days === 1) return `Tmrw ${time}`;
  if (days < 7) return `${DAY_ABBR[d.getDay()]} ${time}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
