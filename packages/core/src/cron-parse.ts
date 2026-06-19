import { CronExpressionParser } from "cron-parser";
import { triggerToCronExpr, nextIntervalOccurrence } from "@agent-os/contracts/trigger-format";
import type { TriggerDoc } from "@agent-os/contracts/trigger-format";
import { getAppTimeZone } from "@agent-os/contracts/timezone";

// Re-export the pure, client-safe helpers so existing imports of these from
// "@agent-os/core/cron-parse" keep working. Client components should import the pure
// helpers from "@agent-os/contracts/trigger-format" directly to avoid bundling cron-parser.
export type { TriggerDoc } from "@agent-os/contracts/trigger-format";
export {
  triggerToCronExpr,
  triggerToLabel,
  formatHour12,
  addIntervalUnits,
} from "@agent-os/contracts/trigger-format";

/** Authoritative next occurrence (server-side), via cron-parser. */
export function nextCronOccurrence(cronExpr: string, from = new Date()): Date {
  const interval = CronExpressionParser.parse(cronExpr, {
    currentDate: from,
    tz: getAppTimeZone(),
  });
  return interval.next().toDate();
}

/** Next run for a single trigger — interval (anchor math) or cron pattern. */
export function triggerNextRun(t: TriggerDoc, from = new Date()): Date | undefined {
  if (t.type === "interval") {
    return nextIntervalOccurrence(t.startAt, t.intervalUnit, t.intervalValue, from) ?? undefined;
  }
  try {
    return nextCronOccurrence(triggerToCronExpr(t), from);
  } catch {
    return undefined; // skip invalid cron
  }
}

export function computeTriggersNextRun(
  triggers: TriggerDoc[],
  from = new Date(),
): Date | undefined {
  let earliest: Date | undefined;
  for (const t of triggers) {
    const next = triggerNextRun(t, from);
    if (next && (!earliest || next < earliest)) earliest = next;
  }
  return earliest;
}
