import {
  getCachedListStatuses,
  setCachedListStatuses,
} from "@agent-os/platform/integrations/clickup/cache";
import { getSprintFolderNames } from "@agent-os/platform/integrations/clickup/sprint-folders";
import {
  getAccessToken,
  loadTokenRecord,
} from "@agent-os/platform/integrations/clickup/store";
import type {
  ClickUpComment,
  ClickUpTask,
  ClickUpTaskStatus,
  ClickUpTimeEntry,
} from "@agent-os/contracts/integrations/clickup/types";

const API_BASE = "https://api.clickup.com/api/v2";
const MAX_PAGES = 6;

export class ClickUpNotConnectedError extends Error {
  constructor() {
    super("ClickUp is not connected");
    this.name = "ClickUpNotConnectedError";
  }
}

export class ClickUpApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ClickUpApiError";
    this.status = status;
  }
}

interface AuthContext {
  token: string;
  teamId: string;
  userId: number;
}

async function getAuthContext(): Promise<AuthContext> {
  const [token, record] = await Promise.all([getAccessToken(), loadTokenRecord()]);
  if (!token || !record) {
    throw new ClickUpNotConnectedError();
  }
  return { token, teamId: record.teamId, userId: record.userId };
}

export interface ClickUpIdentity {
  userId: number;
  username?: string;
  teamId: string;
  teamName?: string;
}

/**
 * Resolve the account owner + default workspace for a raw token. Works for both
 * OAuth access tokens and personal API tokens (same `Authorization` header).
 * Doubles as validation when saving a pasted personal token.
 */
export async function fetchClickUpIdentity(
  token: string,
): Promise<ClickUpIdentity> {
  const headers = { Authorization: token };

  const signal = AbortSignal.timeout(15_000);
  const userRes = await fetch(`${API_BASE}/user`, { headers, signal });
  if (!userRes.ok) {
    throw new ClickUpApiError(userRes.status, "Invalid ClickUp token");
  }
  const userJson = (await userRes.json()) as {
    user?: { id?: number; username?: string };
  };
  const userId = userJson.user?.id;
  if (typeof userId !== "number") {
    throw new ClickUpApiError(400, "Could not resolve ClickUp user");
  }

  const teamRes = await fetch(`${API_BASE}/team`, { headers, signal });
  if (!teamRes.ok) {
    throw new ClickUpApiError(teamRes.status, "Could not load ClickUp workspace");
  }
  const teamJson = (await teamRes.json()) as {
    teams?: { id: string; name?: string }[];
  };
  const team = teamJson.teams?.[0];
  if (!team) {
    throw new ClickUpApiError(400, "No ClickUp workspace available");
  }

  return {
    userId,
    username: userJson.user?.username,
    teamId: team.id,
    teamName: team.name,
  };
}

async function clickupRequest<T>(
  token: string,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = { Authorization: token };
  let body: string | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ClickUpApiError(
      res.status,
      `ClickUp API ${res.status}: ${text.slice(0, 200)}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── normalization ──────────────────────────────────────────────────────────

interface RawTask {
  id: string;
  name?: string;
  status?: { status?: string; color?: string; type?: string; orderindex?: number | string };
  priority?: { priority?: string; color?: string } | null;
  due_date?: string | null;
  url?: string;
  list?: { id?: string; name?: string };
  folder?: { id?: string; name?: string; hidden?: boolean };
  space?: { id?: string };
  tags?: { name?: string; tag_fg?: string; tag_bg?: string }[];
  assignees?: { id?: number; username?: string; initials?: string; color?: string }[];
  markdown_content?: string;
  text_content?: string;
}

function num(value: number | string | undefined, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeTask(raw: RawTask): ClickUpTask {
  return {
    id: raw.id,
    name: raw.name?.trim() || "(Untitled task)",
    status: {
      status: raw.status?.status ?? "open",
      color: raw.status?.color ?? "#94a3b8",
      type: raw.status?.type ?? "open",
      orderindex: num(raw.status?.orderindex),
    },
    priority: raw.priority?.priority
      ? {
          priority: raw.priority.priority,
          color: raw.priority.color ?? "#64748b",
        }
      : null,
    dueDate: raw.due_date ? num(raw.due_date) || null : null,
    url: raw.url ?? "",
    listId: raw.list?.id ?? "",
    listName: raw.list?.name ?? "No list",
    folderName: raw.folder && !raw.folder.hidden ? raw.folder.name ?? null : null,
    spaceId: raw.space?.id ?? null,
    tags: (raw.tags ?? []).map((t) => ({
      name: t.name ?? "",
      fg: t.tag_fg ?? "#475569",
      bg: t.tag_bg ?? "#e2e8f0",
    })),
    assignees: (raw.assignees ?? []).map((a) => ({
      id: a.id ?? 0,
      username: a.username,
      initials: a.initials,
      color: a.color,
    })),
  };
}

// ── reads ──────────────────────────────────────────────────────────────────

/** All workspaces the stored token can access — for the workspace switcher. */
export async function getTeams(): Promise<{ id: string; name: string }[]> {
  const { token } = await getAuthContext();
  const data = await clickupRequest<{ teams?: { id: string; name?: string }[] }>(
    token,
    "/team",
  );
  return (data.teams ?? []).map((t) => ({ id: t.id, name: t.name ?? t.id }));
}

/** Page through `/team/{teamId}/task` for a single filter (e.g. assignee or watcher). */
async function fetchTeamTasks(
  token: string,
  teamId: string,
  filter: { key: "assignees[]" | "watchers[]"; value: string },
  includeClosed: boolean,
): Promise<RawTask[]> {
  const raw: RawTask[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams();
    params.append(filter.key, filter.value);
    params.set("subtasks", "true");
    params.set("include_closed", String(includeClosed));
    params.set("order_by", "due_date");
    params.set("page", String(page));

    const data = await clickupRequest<{ tasks?: RawTask[]; last_page?: boolean }>(
      token,
      `/team/${teamId}/task?${params.toString()}`,
    );
    const batch = data.tasks ?? [];
    raw.push(...batch);
    if (data.last_page || batch.length === 0) break;
  }

  return raw;
}

/**
 * All tasks the connected user participates in across the workspace — tasks
 * assigned to me *and* tasks I watch (ClickUp auto-watches on assign, @mention,
 * or comment, so this covers tasks I'm involved in alongside others). The two
 * filters can't be OR'd in one request, so we query each and union by id.
 */
export async function getMyTasks(opts?: {
  includeClosed?: boolean;
}): Promise<ClickUpTask[]> {
  const { token, teamId, userId } = await getAuthContext();
  const includeClosed = Boolean(opts?.includeClosed);
  const uid = String(userId);

  const [assigned, watching] = await Promise.all([
    fetchTeamTasks(token, teamId, { key: "assignees[]", value: uid }, includeClosed),
    fetchTeamTasks(token, teamId, { key: "watchers[]", value: uid }, includeClosed),
  ]);

  const byId = new Map<string, RawTask>();
  for (const raw of assigned) if (raw.id) byId.set(raw.id, raw);
  for (const raw of watching) if (raw.id) byId.set(raw.id, raw);

  return [...byId.values()].map(normalizeTask);
}

/** Status definitions for a list (cached). Used for the status picker + complete. */
export async function getListStatuses(
  listId: string,
): Promise<ClickUpTaskStatus[]> {
  const cached = getCachedListStatuses(listId);
  if (cached) return cached;

  const { token } = await getAuthContext();
  const data = await clickupRequest<{
    statuses?: { status?: string; color?: string; type?: string; orderindex?: number | string }[];
  }>(token, `/list/${listId}`);

  const statuses: ClickUpTaskStatus[] = (data.statuses ?? []).map((s) => ({
    status: s.status ?? "open",
    color: s.color ?? "#94a3b8",
    type: s.type ?? "open",
    orderindex: num(s.orderindex),
  }));
  setCachedListStatuses(listId, statuses);
  return statuses;
}

export async function getComments(taskId: string): Promise<ClickUpComment[]> {
  const { token } = await getAuthContext();
  const data = await clickupRequest<{
    comments?: {
      id?: string;
      comment_text?: string;
      user?: { id?: number; username?: string; initials?: string; color?: string };
      date?: string;
      resolved?: boolean;
    }[];
  }>(token, `/task/${taskId}/comment`);

  return (data.comments ?? []).map((c) => ({
    id: c.id ?? "",
    text: c.comment_text ?? "",
    user: {
      id: c.user?.id ?? 0,
      username: c.user?.username,
      initials: c.user?.initials,
      color: c.user?.color,
    },
    date: c.date ? num(c.date) || null : null,
    resolved: Boolean(c.resolved),
  }));
}

export async function getCurrentTimer(): Promise<ClickUpTimeEntry | null> {
  const { token, teamId } = await getAuthContext();
  const data = await clickupRequest<{
    data?: { id?: string; task?: { id?: string; name?: string }; start?: string } | null;
  }>(token, `/team/${teamId}/time_entries/current`);

  const entry = data.data;
  if (!entry || !entry.id) return null;
  return {
    id: entry.id,
    taskId: entry.task?.id ?? null,
    taskName: entry.task?.name ?? null,
    start: num(entry.start),
  };
}

// ── writes ───────────────────────────────────────────────────────────────────

export async function updateTask(
  taskId: string,
  patch: {
    status?: string;
    priority?: number | null;
    dueDate?: number | null;
    name?: string;
  },
): Promise<ClickUpTask> {
  const { token } = await getAuthContext();
  const json: Record<string, unknown> = {};
  if (patch.status !== undefined) json.status = patch.status;
  if (patch.priority !== undefined) json.priority = patch.priority;
  if (patch.dueDate !== undefined) json.due_date = patch.dueDate;
  if (patch.name !== undefined) json.name = patch.name;

  const raw = await clickupRequest<RawTask>(token, `/task/${taskId}`, {
    method: "PUT",
    json,
  });
  return normalizeTask(raw);
}

/** Mark a task done by moving it to the list's closed/done status. */
export async function completeTask(
  taskId: string,
  listId: string,
): Promise<ClickUpTask> {
  const statuses = await getListStatuses(listId);
  const done =
    statuses.find((s) => s.type === "closed") ??
    statuses.find((s) => s.type === "done") ??
    statuses[statuses.length - 1];
  if (!done) {
    throw new ClickUpApiError(400, "No closed status available for this list");
  }
  return updateTask(taskId, { status: done.status });
}

export async function createTask(
  listId: string,
  body: { name: string; dueDate?: number | null; priority?: number | null },
): Promise<ClickUpTask> {
  const { token, userId } = await getAuthContext();
  const json: Record<string, unknown> = {
    name: body.name,
    assignees: [userId],
  };
  if (body.dueDate != null) json.due_date = body.dueDate;
  if (body.priority != null) json.priority = body.priority;

  const raw = await clickupRequest<RawTask>(token, `/list/${listId}/task`, {
    method: "POST",
    json,
  });
  return normalizeTask(raw);
}

export async function addComment(
  taskId: string,
  text: string,
): Promise<{ id: string }> {
  const { token } = await getAuthContext();
  const data = await clickupRequest<{ id?: string }>(
    token,
    `/task/${taskId}/comment`,
    { method: "POST", json: { comment_text: text, notify_all: false } },
  );
  return { id: data.id ?? "" };
}

/** Fetch the description fields for a single task (lazy load in modal). */
export async function getTaskDetail(
  taskId: string,
): Promise<{ markdownContent: string | null; textContent: string | null }> {
  const { token } = await getAuthContext();
  const raw = await clickupRequest<RawTask>(token, `/task/${taskId}`);
  return {
    markdownContent: raw.markdown_content?.trim() || null,
    textContent: raw.text_content?.trim() || null,
  };
}

export async function startTimer(taskId: string): Promise<ClickUpTimeEntry | null> {
  const { token, teamId } = await getAuthContext();
  await clickupRequest(token, `/team/${teamId}/time_entries/start`, {
    method: "POST",
    json: { tid: taskId },
  });
  return getCurrentTimer();
}

export async function stopTimer(): Promise<void> {
  const { token, teamId } = await getAuthContext();
  await clickupRequest(token, `/team/${teamId}/time_entries/stop`, {
    method: "POST",
  });
}

// ── sprint (Home card) ───────────────────────────────────────────────────────

export interface SprintListRef {
  listId: string;
  listName: string;
  folderName: string;
}

/** Find a configured sprint folder id from tasks the user is on (assignee or watcher). */
async function resolveSprintFolderRef(
  token: string,
  teamId: string,
  userId: number,
): Promise<{ folderId: string; folderName: string } | null> {
  const sprintFolders = getSprintFolderNames();
  const uid = String(userId);

  const [assigned, watching] = await Promise.all([
    fetchTeamTasks(token, teamId, { key: "assignees[]", value: uid }, false),
    fetchTeamTasks(token, teamId, { key: "watchers[]", value: uid }, false),
  ]);

  for (const raw of [...assigned, ...watching]) {
    const folder = raw.folder;
    if (
      folder?.id &&
      folder.name &&
      !folder.hidden &&
      sprintFolders.has(folder.name.toLowerCase())
    ) {
      return { folderId: folder.id, folderName: folder.name };
    }
  }
  return null;
}

async function getLatestSprintListInFolder(
  token: string,
  folderId: string,
  folderName: string,
): Promise<SprintListRef | null> {
  const data = await clickupRequest<{ lists?: { id: string; name: string }[] }>(
    token,
    `/folder/${folderId}/list?archived=false`,
  );

  let best: SprintListRef | null = null;
  for (const list of data.lists ?? []) {
    if (!best || Number(list.id) > Number(best.listId)) {
      best = { listId: list.id, listName: list.name, folderName };
    }
  }
  return best;
}

/**
 * Newest list in a configured sprint folder (highest list id). Resolves the
 * folder via task metadata, then lists under that folder — works for shared
 * spaces that do not appear on the team space tree.
 */
export async function getLatestSprintList(): Promise<SprintListRef | null> {
  const sprintFolders = getSprintFolderNames();
  if (sprintFolders.size === 0) return null;

  const { token, teamId, userId } = await getAuthContext();
  const folder = await resolveSprintFolderRef(token, teamId, userId);
  if (!folder) return null;

  return getLatestSprintListInFolder(token, folder.folderId, folder.folderName);
}

/**
 * Open tasks assigned to the connected user in a sprint/list. Uses the list
 * endpoint with `include_timl` so tasks added to the sprint from other home
 * lists are included (ClickUp sprint boards work this way).
 */
export async function getMyAssignedTasksInList(
  listId: string,
  opts?: { includeClosed?: boolean },
): Promise<ClickUpTask[]> {
  const { token, userId } = await getAuthContext();
  const includeClosed = Boolean(opts?.includeClosed);
  const raw: RawTask[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams();
    params.append("assignees[]", String(userId));
    params.set("subtasks", "true");
    params.set("include_closed", String(includeClosed));
    params.set("include_timl", "true");
    params.set("page", String(page));

    const data = await clickupRequest<{ tasks?: RawTask[]; last_page?: boolean }>(
      token,
      `/list/${listId}/task?${params.toString()}`,
    );
    const batch = data.tasks ?? [];
    raw.push(...batch);
    if (data.last_page || batch.length === 0) break;
  }

  return raw.map(normalizeTask);
}
