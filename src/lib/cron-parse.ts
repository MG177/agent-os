import { CronExpressionParser } from "cron-parser";
import { triggerToCronExpr } from "./trigger-format";
import type { TriggerDoc } from "./trigger-format";

// Re-export the pure, client-safe helpers so existing imports of these from
// "@/lib/cron-parse" keep working. Client components should import the pure
// helpers from "@/lib/trigger-format" directly to avoid bundling cron-parser.
export type { TriggerDoc } from "./trigger-format";
export {
  triggerToCronExpr,
  triggerToLabel,
  formatHour12,
} from "./trigger-format";

/** Authoritative next occurrence (server-side), via cron-parser. */
export function nextCronOccurrence(cronExpr: string, from = new Date()): Date {
  const interval = CronExpressionParser.parse(cronExpr, { currentDate: from });
  return interval.next().toDate();
}

export function computeTriggersNextRun(
  triggers: TriggerDoc[],
  from = new Date(),
): Date | undefined {
  let earliest: Date | undefined;
  for (const t of triggers) {
    try {
      const next = nextCronOccurrence(triggerToCronExpr(t), from);
      if (!earliest || next < earliest) earliest = next;
    } catch {
      // skip invalid cron
    }
  }
  return earliest;
}
