import {
  getLatestSprintList,
  getMyAssignedTasksInList,
} from "@/lib/integrations/clickup/client";
import { loadTokenRecord } from "@/lib/integrations/clickup/store";
import type { SprintLatestResponse } from "@/lib/integrations/clickup/types";

const TTL_MS = 60 * 1000;

const cache = new Map<string, { expiresAt: number; data: SprintLatestResponse }>();

function sortSprintTasks(
  tasks: SprintLatestResponse["tasks"],
): SprintLatestResponse["tasks"] {
  return [...tasks].sort(
    (a, z) =>
      a.status.orderindex - z.status.orderindex || a.name.localeCompare(z.name),
  );
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

  const tasks = sortSprintTasks(
    await getMyAssignedTasksInList(sprintList.listId),
  );

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
