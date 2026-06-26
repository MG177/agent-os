import {
  getDueTodos,
  getOverdueTodos,
  todosCollection,
  type TodoDoc,
} from "./todos";
import { sendWhatsAppText, getWahaSession } from "./waha";
import { getDb } from "./mongo";
import { prevCronOccurrence } from "@agent-os/core/cron-parse";
import { dueState } from "@agent-os/core/todo-format";

/** Destination chat for todo-due notifications — falls back to the first capture-allowed JID. */
function notifyJid(): string | undefined {
  const explicit = process.env.WHATSAPP_NOTIFY_JID?.trim();
  if (explicit) return explicit;
  const allowed = process.env.WHATSAPP_ALLOWED_JIDS?.trim();
  if (!allowed) return undefined;
  return allowed.split(",")[0]?.trim() || undefined;
}

function formatNotification(todo: TodoDoc): string {
  const lines = [`\u{1F514} Todo due: ${todo.title}`];
  if (todo.notes) lines.push(todo.notes);
  return lines.join("\n");
}

/**
 * Sends a WhatsApp message for every enabled, incomplete todo whose trigger has
 * just fired (nextRunAt <= now) and hasn't been notified for this occurrence yet.
 * Safe to call repeatedly (e.g. on a poll loop) — `notifiedRunAt` dedupes sends.
 */
export async function notifyDueTodos(now = new Date()): Promise<number> {
  const jid = notifyJid();
  if (!jid) return 0;

  const due = await getDueTodos();
  const pending = due.filter(
    (t) =>
      t.nextRunAt &&
      t.nextRunAt.getTime() <= now.getTime() &&
      (!t.notifiedRunAt || t.notifiedRunAt.getTime() !== t.nextRunAt.getTime()),
  );
  if (pending.length === 0) return 0;

  const col = await todosCollection();
  for (const todo of pending) {
    await sendWhatsAppText({
      session: getWahaSession(),
      chatId: jid,
      text: formatNotification(todo),
    });
    await col.updateOne(
      { _id: todo._id },
      { $set: { notifiedRunAt: todo.nextRunAt, updatedAt: now } },
    );
  }
  return pending.length;
}

// --- Overdue reminder digest ----------------------------------------------
//
// A recurring nag, distinct from notifyDueTodos (which pings once the moment a
// todo first becomes due). At each fixed slot — 06/09/12/15/18/21 in the app
// timezone by default — this sends one consolidated WhatsApp message listing
// every todo still overdue. Override the cadence with OVERDUE_REMINDER_CRON;
// disable with AGENT_OS_DISABLE_OVERDUE_REMINDER=1.

const DEFAULT_REMINDER_CRON = "0 6,9,12,15,18,21 * * *";
const REMINDER_STATE_ID = "overdue-reminder";

/**
 * How long after a slot we'll still fire it. Bounds catch-up after downtime so a
 * cold start in the overnight gap doesn't replay the previous evening's slot.
 * Sized to the inter-slot gap (3h) so an outage shorter than one slot recovers.
 */
const REMINDER_CATCHUP_MS = 3 * 60 * 60 * 1000;

interface ReminderStateDoc {
  _id: string;
  /** The most recent slot already sent — dedupes the once-per-minute poll. */
  lastSlot: Date;
  updatedAt: Date;
}

async function reminderStateCollection() {
  const db = await getDb();
  return db.collection<ReminderStateDoc>("todo_notify_state");
}

function reminderCron(): string {
  return process.env.OVERDUE_REMINDER_CRON?.trim() || DEFAULT_REMINDER_CRON;
}

function formatOverdueDigest(todos: TodoDoc[], now: Date): string {
  const header =
    todos.length === 1
      ? "\u{26A0}\u{FE0F} 1 overdue todo"
      : `\u{26A0}\u{FE0F} ${todos.length} overdue todos`;
  const lines = todos.map((t) => {
    const state = dueState(t.nextRunAt ?? null, now.getTime());
    return state ? `• ${t.title} (${state.label})` : `• ${t.title}`;
  });
  return [header, ...lines].join("\n");
}

/**
 * At each reminder slot, send one WhatsApp digest of every still-overdue todo.
 * Safe to call every minute: the slot is claimed in `todo_notify_state` before
 * sending, so each slot fires at most once even across restarts, and a
 * zero-overdue or failed run doesn't retry until the next slot.
 */
export async function remindOverdueTodos(now = new Date()): Promise<number> {
  if (process.env.AGENT_OS_DISABLE_OVERDUE_REMINDER === "1") return 0;
  const jid = notifyJid();
  if (!jid) return 0;

  let slot: Date;
  try {
    slot = prevCronOccurrence(reminderCron(), now);
  } catch {
    return 0; // invalid cron override — skip rather than crash the poll
  }
  if (now.getTime() - slot.getTime() > REMINDER_CATCHUP_MS) return 0;

  const state = await reminderStateCollection();
  const prev = await state.findOne({ _id: REMINDER_STATE_ID });
  if (prev?.lastSlot && prev.lastSlot.getTime() >= slot.getTime()) return 0;

  // Claim the slot up front so a send failure or an empty run doesn't make us
  // re-check every minute until the next slot.
  await state.updateOne(
    { _id: REMINDER_STATE_ID },
    { $set: { lastSlot: slot, updatedAt: now } },
    { upsert: true },
  );

  const overdue = await getOverdueTodos(now);
  if (overdue.length === 0) return 0;

  await sendWhatsAppText({
    session: getWahaSession(),
    chatId: jid,
    text: formatOverdueDigest(overdue, now),
  });
  return overdue.length;
}
