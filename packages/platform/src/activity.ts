import { listInbox } from "@agent-os/platform/vault";
import { readLog, todayISO } from "@agent-os/platform/nutrition";
import {
  readAudit,
  isWithinUndoWindow,
  type AuditEntry,
  type AuditSource,
} from "@agent-os/platform/audit";

export type ActivityKind = "capture" | "nutrition" | "reverted" | "whatsapp";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  text: string;
  timestamp: number;
  undoable: boolean;
  reverted?: boolean;
  source?: AuditSource;
  slug?: string;
  mealId?: string;
}

export { isWithinUndoWindow };

function captureKind(source?: AuditSource): ActivityKind {
  return source === "whatsapp" ? "whatsapp" : "capture";
}

function captureText(source?: AuditSource): string {
  return source === "whatsapp"
    ? "WhatsApp capture → Inbox"
    : "Capture saved → Inbox";
}

interface BuildState {
  events: ActivityEvent[];
  seenCaptureTargets: Set<string>;
  seenMealTargets: Set<string>;
}

function emitFromAudit(audit: AuditEntry[]): BuildState {
  const state: BuildState = {
    events: [],
    seenCaptureTargets: new Set(),
    seenMealTargets: new Set(),
  };

  const revertedCaptureTargets = new Set(
    audit.filter((e) => e.action === "capture.revert").map((e) => e.target),
  );
  const revertedMealTargets = new Set(
    audit.filter((e) => e.action === "nutrition.revert").map((e) => e.target),
  );

  for (const entry of audit) {
    if (entry.action === "capture.create") {
      state.seenCaptureTargets.add(entry.target);
      const reverted = revertedCaptureTargets.has(entry.target);
      state.events.push({
        id: `audit-${entry.id}`,
        kind: captureKind(entry.source),
        text: captureText(entry.source),
        timestamp: entry.ts,
        undoable: !reverted && isWithinUndoWindow(entry.ts),
        reverted,
        source: entry.source,
        slug: entry.target,
      });
    } else if (entry.action === "capture.revert") {
      state.events.push({
        id: `audit-${entry.id}`,
        kind: "reverted",
        text: "Capture reverted (archived)",
        timestamp: entry.ts,
        undoable: false,
        source: entry.source,
        slug: entry.target,
      });
    } else if (entry.action === "nutrition.create") {
      state.seenMealTargets.add(entry.target);
      const reverted = revertedMealTargets.has(entry.target);
      const foodName =
        (entry.meta?.food_name as string | undefined) ?? "meal";
      state.events.push({
        id: `audit-${entry.id}`,
        kind: "nutrition",
        text: `Meal logged — ${foodName}`,
        timestamp: entry.ts,
        undoable: !reverted && isWithinUndoWindow(entry.ts),
        reverted,
        source: entry.source,
        mealId: entry.target,
      });
    } else if (entry.action === "nutrition.revert") {
      const foodName =
        (entry.meta?.food_name as string | undefined) ?? "meal";
      state.events.push({
        id: `audit-${entry.id}`,
        kind: "reverted",
        text: `Meal reverted — ${foodName}`,
        timestamp: entry.ts,
        undoable: false,
        source: entry.source,
        mealId: entry.target,
      });
    }
  }

  return state;
}

/** Surface inbox files / meal entries that pre-date the audit log so the feed isn't empty after rollout. */
async function emitLegacyFallback(state: BuildState): Promise<void> {
  for (const item of listInbox()) {
    if (state.seenCaptureTargets.has(item.slug)) continue;
    state.events.push({
      id: `legacy-capture-${item.slug}`,
      kind: "capture",
      text: "Capture saved → Inbox",
      timestamp: item.mtime,
      undoable: isWithinUndoWindow(item.mtime),
      source: "system",
      slug: item.slug,
    });
  }

  const date = todayISO();
  for (const entry of await readLog(date)) {
    if (state.seenMealTargets.has(entry.timestamp)) continue;
    const ts = new Date(entry.timestamp).getTime();
    state.events.push({
      id: `legacy-meal-${entry.timestamp}`,
      kind: "nutrition",
      text: `Meal logged — ${entry.food_name}`,
      timestamp: ts,
      undoable: isWithinUndoWindow(ts),
      source: "system",
      mealId: entry.timestamp,
    });
  }
}

export async function buildActivityFeed(limit = 50): Promise<ActivityEvent[]> {
  const state = emitFromAudit(readAudit());
  await emitLegacyFallback(state);

  return state.events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function countCapturesToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  return listInbox().filter(
    (i) => i.date === today || i.filename.startsWith(today),
  ).length;
}
