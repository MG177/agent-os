import { clearSprintCache } from "@agent-os/platform/integrations/clickup/sprint-service";
import type {
  ClickUpTask,
  ClickUpTaskStatus,
} from "@agent-os/contracts/integrations/clickup/types";

/** Short TTL — tasks change often and we always allow ?refresh=1 to bypass. */
const TASKS_TTL_MS = 60 * 1000;
/** List status definitions are stable; cache a little longer. */
const STATUS_TTL_MS = 10 * 60 * 1000;

interface TasksEntry {
  expiresAt: number;
  tasks: ClickUpTask[];
}
interface StatusEntry {
  expiresAt: number;
  statuses: ClickUpTaskStatus[];
}

const tasksCache = new Map<string, TasksEntry>();
const listStatusCache = new Map<string, StatusEntry>();

export function getCachedTasks(key: string): ClickUpTask[] | null {
  const entry = tasksCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tasksCache.delete(key);
    return null;
  }
  return entry.tasks;
}

export function setCachedTasks(key: string, tasks: ClickUpTask[]) {
  tasksCache.set(key, { expiresAt: Date.now() + TASKS_TTL_MS, tasks });
}

export function getCachedListStatuses(
  listId: string,
): ClickUpTaskStatus[] | null {
  const entry = listStatusCache.get(listId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    listStatusCache.delete(listId);
    return null;
  }
  return entry.statuses;
}

export function setCachedListStatuses(
  listId: string,
  statuses: ClickUpTaskStatus[],
) {
  listStatusCache.set(listId, {
    expiresAt: Date.now() + STATUS_TTL_MS,
    statuses,
  });
}

export function clearClickUpCache() {
  tasksCache.clear();
  listStatusCache.clear();
  clearSprintCache();
}
