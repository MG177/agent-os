import {
  ClickUpNotConnectedError,
  getListStatuses,
} from "@/lib/integrations/clickup/client";
import { loadTokenRecord } from "@/lib/integrations/clickup/store";
import {
  CLICKUP_CACHE_TTL_MS,
  getSyncMeta,
  readSprintTaskDocs,
  syncClickUpTasks,
} from "@/lib/integrations/clickup/sync";
import type {
  ClickUpTask,
  ClickUpTaskStatus,
  SprintLatestResponse,
} from "@/lib/integrations/clickup/types";

const EMPTY: SprintLatestResponse = { list: null, tasks: [], count: 0 };

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

/** Retained for API compatibility; sprint freshness now flows through syncClickUpTasks. */
export function clearSprintCache(): void {}

/**
 * Latest sprint list (resolved + persisted by the sync layer) + open tasks
 * assigned to me in that list, served from the Mongo cache. No due-date filter;
 * watchers are excluded. Cold/explicit-refresh blocks on one sync; a stale
 * snapshot is served immediately and refreshed in the background (SWR).
 */
export async function getLatestSprintTasksCached(opts?: {
  skipCache?: boolean;
}): Promise<SprintLatestResponse> {
  const record = await loadTokenRecord();
  if (!record) throw new ClickUpNotConnectedError();
  const teamId = record.teamId;

  let meta = await getSyncMeta(teamId);
  const fresh = meta?.syncedAt
    ? Date.now() - new Date(meta.syncedAt).getTime() < CLICKUP_CACHE_TTL_MS
    : false;

  if (opts?.skipCache || !meta?.syncedAt) {
    await syncClickUpTasks({ reason: opts?.skipCache ? "sprint-refresh" : "sprint-cold" });
    meta = await getSyncMeta(teamId);
  } else if (!fresh) {
    void syncClickUpTasks({ reason: "sprint-swr" }).catch(() => {});
  }

  if (!meta?.sprintListId) return EMPTY;

  const docs = await readSprintTaskDocs(teamId, meta.sprintListId);
  const listStatuses = await getListStatuses(meta.sprintListId);
  const tasks = sortSprintTasks(
    filterBeforeTesting(
      docs.map((d) => d.task),
      listStatuses,
    ),
  );

  return {
    list: {
      listId: meta.sprintListId,
      listName: meta.sprintListName ?? "",
      folderName: meta.sprintFolderName ?? "",
      isSprint: true,
    },
    tasks,
    count: tasks.length,
  };
}
