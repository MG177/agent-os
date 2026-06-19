import { getCachedTasks, setCachedTasks } from "@/lib/integrations/clickup/cache";
import { getMyTasks } from "@/lib/integrations/clickup/client";
import type { ClickUpTask } from "@/lib/integrations/clickup/types";

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
