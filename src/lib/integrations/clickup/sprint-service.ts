import {
  getLatestSprintList,
  getListStatuses,
  getMyAssignedTasksInList,
} from "@/lib/integrations/clickup/client";
import { loadTokenRecord } from "@/lib/integrations/clickup/store";
import type {
  ClickUpTask,
  ClickUpTaskStatus,
  SprintLatestResponse,
} from "@/lib/integrations/clickup/types";

const TTL_MS = 60 * 1000;

const cache = new Map<string, { expiresAt: number; data: SprintLatestResponse }>();

function normStatus(name: string): string {
  return name.trim().toLowerCase();
}

function isInProgressDevelopment(status: string): boolean {
  return normStatus(status) === "in progress development";
}

/** Home sprint card: only tasks still before the TESTING workflow step. */
function filterBeforeTesting(
  tasks: ClickUpTask[],
  listStatuses: ClickUpTaskStatus[],
): ClickUpTask[] {
  const testing = listStatuses.find((s) => normStatus(s.status) === "testing");
  if (!testing) return tasks;
  return tasks.filter((t) => t.status.orderindex < testing.orderindex);
}

function sortSprintTasks(tasks: ClickUpTask[]): ClickUpTask[] {
  return [...tasks].sort((a, z) => {
    const aDev = isInProgressDevelopment(a.status.status);
    const zDev = isInProgressDevelopment(z.status.status);
    if (aDev !== zDev) return aDev ? -1 : 1;
    return (
      z.status.orderindex - a.status.orderindex || a.name.localeCompare(z.name)
    );
  });
}

export function clearSprintCache(): void {
  cache.clear();
}

/**
 * Latest sprint list (from folder hierarchy) + open tasks assigned to me in
 * that list. No due-date filter; watchers are excluded.
 */
export async function getLatestSprintTasksCached(opts?: {
  skipCache?: boolean;
}): Promise<SprintLatestResponse> {
  const record = await loadTokenRecord();
  const key = `sprint:latest|${record?.teamId ?? "unknown"}`;

  if (!opts?.skipCache) {
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.data;
  }

  const sprintList = await getLatestSprintList();
  if (!sprintList) {
    const empty: SprintLatestResponse = { list: null, tasks: [], count: 0 };
    cache.set(key, { expiresAt: Date.now() + TTL_MS, data: empty });
    return empty;
  }

  const [rawTasks, listStatuses] = await Promise.all([
    getMyAssignedTasksInList(sprintList.listId),
    getListStatuses(sprintList.listId),
  ]);
  const tasks = sortSprintTasks(filterBeforeTesting(rawTasks, listStatuses));

  const data: SprintLatestResponse = {
    list: {
      listId: sprintList.listId,
      listName: sprintList.listName,
      folderName: sprintList.folderName,
      isSprint: true,
    },
    tasks,
    count: tasks.length,
  };

  cache.set(key, { expiresAt: Date.now() + TTL_MS, data });
  return data;
}
