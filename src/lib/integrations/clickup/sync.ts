/**
 * MongoDB-backed read-through cache for ClickUp tasks.
 *
 * The live ClickUp REST flow is slow on a cold cache (sequential pagination +
 * a full task re-scan just to find the sprint folder). This module persists the
 * connected user's tasks into Mongo so reads are instant and survive restarts.
 * Freshness is kept by three triggers, all routed through `syncClickUpTasks`:
 *   - a background interval (instrumentation.ts, full deployments only),
 *   - refresh-on-read / SWR (the two service wrappers), and
 *   - write-through on mutate (`upsertClickUpTask` / `removeClickUpTask`).
 *
 * One document per task (see ClickUpTaskDoc) so write-through is a single
 * replaceOne and pruning is a deleteMany; every existing view reconstructs from
 * a flat find(). Mirrors the upsert + ready() conventions in nutrition-mongo.ts.
 */

import {
  getLatestSprintList,
  getMyAssignedTasksInList,
  getMyTasksWithParticipation,
} from "@/lib/integrations/clickup/client";
import { loadTokenRecord } from "@/lib/integrations/clickup/store";
import type { ClickUpTask } from "@/lib/integrations/clickup/types";
import {
  clickupSyncMetaCollection,
  clickupTasksCollection,
  ensureIndexes,
  type ClickUpSyncMetaDoc,
  type ClickUpTaskDoc,
} from "@/lib/mongo";

/** Read-side staleness threshold — a read older than this kicks a background sync. */
export const CLICKUP_CACHE_TTL_MS =
  Number(process.env.CLICKUP_SYNC_INTERVAL_MS) || 150_000;

let readyPromise: Promise<void> | null = null;

/** Ensure indexes exist before the first read/write (idempotent, cached). */
function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureIndexes().catch((err) => {
      readyPromise = null; // allow retry after a transient Mongo failure
      throw err;
    });
  }
  return readyPromise;
}

// ── sync ─────────────────────────────────────────────────────────────────────

let inFlight: Promise<void> | null = null;

/**
 * Refresh the whole ClickUp cache from the live API. Single-flight: concurrent
 * callers (background tick + a cold read) share one in-flight sync instead of
 * stampeding the ClickUp API.
 */
export function syncClickUpTasks(opts?: { reason?: string }): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doSync(opts).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doSync(_opts?: { reason?: string }): Promise<void> {
  const record = await loadTokenRecord();
  if (!record) return; // not connected — nothing to sync
  const teamId = record.teamId;

  await ready();
  const meta = await clickupSyncMetaCollection();
  await meta.updateOne(
    { _id: teamId },
    { $set: { syncStatus: "syncing" }, $setOnInsert: { syncedAt: null } },
    { upsert: true },
  );

  try {
    const metaDoc = await meta.findOne({ _id: teamId });
    const cachedFolder = metaDoc?.sprintFolderId
      ? {
          folderId: metaDoc.sprintFolderId,
          folderName: metaDoc.sprintFolderName ?? "",
        }
      : null;

    // Participation (assignee ∪ watcher) and the sprint list are independent.
    const [participation, sprintList] = await Promise.all([
      getMyTasksWithParticipation({ includeClosed: false }),
      getLatestSprintList(cachedFolder),
    ]);
    const sprintTasks = sprintList
      ? await getMyAssignedTasksInList(sprintList.listId)
      : [];

    const now = new Date().toISOString();
    const docs = new Map<string, ClickUpTaskDoc>();
    for (const { task, isAssignee, isWatcher } of participation) {
      docs.set(task.id, {
        _id: task.id,
        teamId,
        task,
        listId: task.listId,
        isAssignee,
        isWatcher,
        inSprintList: false,
        syncedAt: now,
      });
    }
    for (const task of sprintTasks) {
      const existing = docs.get(task.id);
      if (existing) {
        existing.inSprintList = true;
      } else {
        // Only in the sprint-list fetch (filtered by assignee = me) → assignee.
        docs.set(task.id, {
          _id: task.id,
          teamId,
          task,
          listId: task.listId,
          isAssignee: true,
          isWatcher: false,
          inSprintList: true,
          syncedAt: now,
        });
      }
    }

    const tasks = await clickupTasksCollection();
    const liveIds = [...docs.keys()];
    if (docs.size > 0) {
      await tasks.bulkWrite(
        [...docs.values()].map((doc) => ({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        })),
        { ordered: false },
      );
    }
    // Drop tasks that are no longer returned (completed elsewhere, reassigned…).
    // Empty liveIds → genuinely zero tasks → clear this team's cache.
    await tasks.deleteMany({ teamId, _id: { $nin: liveIds } });

    await meta.updateOne(
      { _id: teamId },
      {
        $set: {
          syncedAt: now,
          sprintFolderId: sprintList?.folderId ?? null,
          sprintFolderName: sprintList?.folderName ?? null,
          sprintListId: sprintList?.listId ?? null,
          sprintListName: sprintList?.listName ?? null,
          syncStatus: "ok",
          lastError: null,
          taskCount: docs.size,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    await meta.updateOne(
      { _id: teamId },
      {
        $set: {
          syncStatus: "error",
          lastError: err instanceof Error ? err.message : String(err),
        },
      },
      { upsert: true },
    );
    throw err;
  }
}

// ── write-through ──────────────────────────────────────────────────────────

/** Upsert a single task (after create/update) without a full re-sync. */
export async function upsertClickUpTask(task: ClickUpTask): Promise<void> {
  const record = await loadTokenRecord();
  if (!record) return;
  await ready();
  const tasks = await clickupTasksCollection();
  const existing = await tasks.findOne({ _id: task.id });
  const doc: ClickUpTaskDoc = {
    _id: task.id,
    teamId: record.teamId,
    task,
    listId: task.listId,
    // Preserve participation if known; a freshly-created task is assigned to me.
    isAssignee: existing?.isAssignee ?? true,
    isWatcher: existing?.isWatcher ?? false,
    inSprintList: existing?.inSprintList ?? false,
    syncedAt: new Date().toISOString(),
  };
  await tasks.replaceOne({ _id: task.id }, doc, { upsert: true });
}

/** Remove a single task (after completing it — the cache holds open tasks only). */
export async function removeClickUpTask(taskId: string): Promise<void> {
  await ready();
  const tasks = await clickupTasksCollection();
  await tasks.deleteOne({ _id: taskId });
}

/** Wipe all cached tasks + sync state (used on disconnect). */
export async function resetClickUpCache(): Promise<void> {
  await ready();
  const [tasks, meta] = await Promise.all([
    clickupTasksCollection(),
    clickupSyncMetaCollection(),
  ]);
  await Promise.all([tasks.deleteMany({}), meta.deleteMany({})]);
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function getSyncMeta(
  teamId: string,
): Promise<ClickUpSyncMetaDoc | null> {
  await ready();
  const meta = await clickupSyncMetaCollection();
  return meta.findOne({ _id: teamId });
}

/** Cache age check: true when the last successful sync is within `ttlMs`. */
export async function isFresh(teamId: string, ttlMs: number): Promise<boolean> {
  const m = await getSyncMeta(teamId);
  if (!m?.syncedAt) return false;
  return Date.now() - new Date(m.syncedAt).getTime() < ttlMs;
}

/** All cached tasks for the board view (assignee ∪ watcher ∪ sprint). */
export async function readTaskDocs(teamId: string): Promise<ClickUpTaskDoc[]> {
  await ready();
  const tasks = await clickupTasksCollection();
  return tasks.find({ teamId }).toArray();
}

/** Cached tasks belonging to the resolved sprint list. */
export async function readSprintTaskDocs(
  teamId: string,
  listId: string,
): Promise<ClickUpTaskDoc[]> {
  await ready();
  const tasks = await clickupTasksCollection();
  return tasks.find({ teamId, listId, inSprintList: true }).toArray();
}
