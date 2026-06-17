import { getMyTasks } from "@/lib/integrations/clickup/client";
import { loadTokenRecord } from "@/lib/integrations/clickup/store";
import {
  CLICKUP_CACHE_TTL_MS,
  isFresh,
  readTaskDocs,
  syncClickUpTasks,
} from "@/lib/integrations/clickup/sync";
import type { ClickUpTask } from "@/lib/integrations/clickup/types";

/**
 * My tasks, served from the Mongo cache. Shared by the tasks list, the lists
 * picker, and the Home widget so they all read one persisted snapshot.
 *
 * - Cold cache (or `skipCache`): block on one sync, then read.
 * - Stale cache: serve immediately and refresh in the background (SWR).
 * - `includeClosed` or not connected: fall through to a live fetch (the cache
 *   only holds open tasks, and a live call preserves the not-connected error).
 */
export async function getMyTasksCached(opts?: {
  includeClosed?: boolean;
  skipCache?: boolean;
}): Promise<ClickUpTask[]> {
  const includeClosed = Boolean(opts?.includeClosed);

  const record = await loadTokenRecord();
  if (!record || includeClosed) {
    return getMyTasks({ includeClosed });
  }
  const teamId = record.teamId;

  const fresh = await isFresh(teamId, CLICKUP_CACHE_TTL_MS);
  let docs = await readTaskDocs(teamId);

  if (opts?.skipCache || (docs.length === 0 && !fresh)) {
    await syncClickUpTasks({ reason: opts?.skipCache ? "refresh" : "cold" });
    docs = await readTaskDocs(teamId);
  } else if (!fresh) {
    void syncClickUpTasks({ reason: "swr" }).catch(() => {});
  }

  return docs.map((d) => d.task);
}
