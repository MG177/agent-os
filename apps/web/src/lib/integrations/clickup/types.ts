/** Persisted, encrypted token + workspace identity for the connected account. */
export interface ClickUpTokenRecord {
  encryptedAccessToken: string;
  userId: number;
  username?: string;
  teamId: string;
  teamName?: string;
  connectedAt: string;
  updatedAt: string;
}

export interface ClickUpStatus {
  /** A token is saved and decryptable. */
  connected: boolean;
  /** Can connect at all (encryption key present) — i.e. the token path is open. */
  configured: boolean;
  /** The optional OAuth "Connect" button is available (app registered). */
  oauthConfigured: boolean;
  username?: string;
  teamName?: string;
  connectedAt?: string;
}

/** A ClickUp status as it appears on a task or in a list definition. */
export interface ClickUpTaskStatus {
  status: string;
  color: string;
  /** open | custom | done | closed */
  type: string;
  orderindex: number;
}

export interface ClickUpTag {
  name: string;
  fg: string;
  bg: string;
}

export interface ClickUpAssignee {
  id: number;
  username?: string;
  initials?: string;
  color?: string;
}

/** Normalized task shape returned by our API (subset of the ClickUp task). */
export interface ClickUpTask {
  id: string;
  name: string;
  status: ClickUpTaskStatus;
  priority: { priority: string; color: string } | null;
  /** epoch milliseconds, or null when no due date. */
  dueDate: number | null;
  url: string;
  listId: string;
  listName: string;
  folderName: string | null;
  spaceId: string | null;
  tags: ClickUpTag[];
  assignees: ClickUpAssignee[];
}

/** Tasks of one status within a list. */
export interface ClickUpStatusGroup {
  status: string;
  color: string;
  type: string;
  orderindex: number;
  tasks: ClickUpTask[];
}

/** All my tasks within one list, grouped by status. */
export interface ClickUpListGroup {
  listId: string;
  listName: string;
  folderName: string | null;
  /** List lives in a folder configured as a sprint (CLICKUP_SPRINT_FOLDERS). */
  isSprint: boolean;
  count: number;
  statuses: ClickUpStatusGroup[];
}

export interface ClickUpListOption {
  listId: string;
  listName: string;
  folderName: string | null;
  isSprint: boolean;
}

/** Home sprint card — latest sprint list + tasks assigned to the connected user. */
export interface SprintLatestResponse {
  list: ClickUpListOption | null;
  tasks: ClickUpTask[];
  count: number;
}

export interface ClickUpGroupedTasks {
  /** Primary view: grouped by list, then status. */
  groups: ClickUpListGroup[];
  /** Flat list (filtered) for the board view and totals. */
  flat: ClickUpTask[];
  /** Distinct lists present in the result, for the quick-add picker. */
  lists: ClickUpListOption[];
  counts: { total: number; dueToday: number; overdue: number; week: number };
}

export interface ClickUpComment {
  id: string;
  text: string;
  user: { id: number; username?: string; initials?: string; color?: string };
  date: number | null;
  resolved: boolean;
}

export interface ClickUpTimeEntry {
  id: string;
  taskId: string | null;
  taskName: string | null;
  /** epoch milliseconds the timer started. */
  start: number;
}
