import { getDb } from "./mongo";
import type { Collection } from "mongodb";
import {
  type TriggerDoc,
  triggerToCronExpr,
  triggerToLabel,
  computeTriggersNextRun,
  nextCronOccurrence,
} from "./cron-parse";

export type { TriggerDoc };

export interface TodoDoc {
  _id: string;
  title: string;
  notes?: string;
  type: "once" | "recurring";
  dueAt?: Date;
  triggers?: TriggerDoc[];
  nextRunAt?: Date;
  enabled: boolean;
  completedAt?: Date;
  lastDoneAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function todosCollection(): Promise<Collection<TodoDoc>> {
  const db = await getDb();
  return db.collection<TodoDoc>("todos");
}

export async function ensureTodosIndex(): Promise<void> {
  const col = await todosCollection();
  await col.createIndex({ nextRunAt: 1 });
  await col.createIndex({ enabled: 1, completedAt: 1 });
}

export type ListFilter = "active" | "completed" | "all";

export async function listTodos(filter: ListFilter = "active"): Promise<TodoDoc[]> {
  const col = await todosCollection();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> =
    filter === "active"
      ? { $or: [{ completedAt: { $exists: false } }, { completedAt: null }] }
      : filter === "completed"
        ? { completedAt: { $exists: true, $ne: null } }
        : {};
  return col.find(query).sort({ nextRunAt: 1 }).toArray();
}

export async function getDueTodos(): Promise<TodoDoc[]> {
  const col = await todosCollection();
  const horizon = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    enabled: true,
    $or: [{ completedAt: { $exists: false } }, { completedAt: null }],
    nextRunAt: { $lte: horizon },
  };
  return col.find(query).sort({ nextRunAt: 1 }).limit(10).toArray();
}

export interface CreateTodoInput {
  title: string;
  notes?: string;
  type: "once" | "recurring";
  dueAt?: Date;
  triggers?: TriggerDoc[];
}

function hydrateTriggers(triggers: TriggerDoc[], from: Date): TriggerDoc[] {
  return triggers.map((t) => ({
    ...t,
    label: triggerToLabel(t),
    nextRunAt: nextCronOccurrence(triggerToCronExpr(t), from),
  }));
}

export async function createTodo(input: CreateTodoInput): Promise<TodoDoc> {
  const col = await todosCollection();
  const now = new Date();

  const triggers =
    input.type === "recurring" && input.triggers
      ? hydrateTriggers(input.triggers, now)
      : undefined;

  const nextRunAt =
    input.type === "once"
      ? input.dueAt
      : triggers
        ? computeTriggersNextRun(triggers, now)
        : undefined;

  const doc: TodoDoc = {
    _id: crypto.randomUUID(),
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    type: input.type,
    dueAt: input.dueAt,
    triggers,
    nextRunAt,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

export async function doneTodo(id: string): Promise<TodoDoc | null> {
  const col = await todosCollection();
  const doc = await col.findOne({ _id: id });
  if (!doc) return null;

  const now = new Date();
  if (doc.type === "once") {
    await col.updateOne({ _id: id }, { $set: { completedAt: now, updatedAt: now } });
    return { ...doc, completedAt: now, updatedAt: now };
  }

  const triggers = doc.triggers ? hydrateTriggers(doc.triggers, now) : undefined;
  const nextRunAt = triggers ? computeTriggersNextRun(triggers, now) : undefined;
  await col.updateOne(
    { _id: id },
    { $set: { triggers, lastDoneAt: now, nextRunAt, updatedAt: now } },
  );
  return { ...doc, triggers, lastDoneAt: now, nextRunAt, updatedAt: now };
}

export interface UpdateTodoInput {
  title?: string;
  notes?: string;
  enabled?: boolean;
  dueAt?: Date;
  triggers?: TriggerDoc[];
}

export async function updateTodo(
  id: string,
  patch: UpdateTodoInput,
): Promise<TodoDoc | null> {
  const col = await todosCollection();
  const doc = await col.findOne({ _id: id });
  if (!doc) return null;

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set: Record<string, any> = { updatedAt: now };

  if (patch.title !== undefined) set.title = patch.title.trim();
  if (patch.notes !== undefined) set.notes = patch.notes.trim() || undefined;
  if (patch.enabled !== undefined) set.enabled = patch.enabled;
  if (patch.dueAt !== undefined) {
    set.dueAt = patch.dueAt;
    set.nextRunAt = patch.dueAt;
  }
  if (patch.triggers !== undefined) {
    const triggers = hydrateTriggers(patch.triggers, now);
    set.triggers = triggers;
    set.nextRunAt = computeTriggersNextRun(triggers, now);
  }

  await col.updateOne({ _id: id }, { $set: set });
  return col.findOne({ _id: id });
}

export async function deleteTodo(id: string): Promise<boolean> {
  const col = await todosCollection();
  const result = await col.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
