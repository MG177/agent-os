import { getDueTodos, todosCollection, type TodoDoc } from "./todos";
import { sendWhatsAppText, getWahaSession } from "./waha";

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
