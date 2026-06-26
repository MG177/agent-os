import { getCachedTasks, setCachedTasks } from "@agent-os/platform/integrations/clickup/cache";
import { getMyTasks } from "@agent-os/platform/integrations/clickup/client";
import type { ClickUpTask } from "@agent-os/contracts/integrations/clickup/types";

/**
 * Fetch my tasks with a short cache. Shared by the tasks list, the lists
 * picker, and the Home widget so a single ClickUp round-trip serves them all.
 */
export async function getMyTasksCached(opts?: {
  includeClosed?: boolean;
  skipCache?: boolean;
}): Promise<ClickUpTask[]> {
  const includeClosed = Boolean(opts?.includeClosed);
  const key = `my|closed:${includeClosed}`;

  if (!opts?.skipCache) {
    const cached = getCachedTasks(key);
    if (cached) return cached;
  }

  const tasks = await getMyTasks({ includeClosed });
  setCachedTasks(key, tasks);
  return tasks;
}
