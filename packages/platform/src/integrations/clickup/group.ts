import type {
  ClickUpGroupedTasks,
  ClickUpListGroup,
  ClickUpListOption,
  ClickUpStatusGroup,
  ClickUpTask,
} from "@agent-os/contracts/integrations/clickup/types";
import { getSprintFolderNames } from "@agent-os/platform/integrations/clickup/sprint-folders";
import { getAppTimeZone } from "@agent-os/contracts/timezone";

export type DueFilter = "all" | "overdue" | "today" | "week";

function tzOffsetMinutes(timeZone: string, probe: Date): number {
  const utc = Date.parse(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = Date.parse(probe.toLocaleString("en-US", { timeZone }));
  return Math.round((zoned - utc) / 60_000);
}

/** Epoch ms for local midnight today in the app timezone. */
function startOfTodayMs(): number {
  const tz = getAppTimeZone();
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const offset = tzOffsetMinutes(tz, now);
  return Date.parse(`${y}-${m}-${d}T00:00:00Z`) - offset * 60_000;
}

function dueBuckets() {
  const todayStart = startOfTodayMs();
  return {
    todayStart,
    todayEnd: todayStart + 86_400_000,
    weekEnd: todayStart + 7 * 86_400_000,
  };
}

export function isOverdue(task: ClickUpTask, todayStart: number): boolean {
  return task.dueDate != null && task.dueDate < todayStart;
}

export function isDueToday(
  task: ClickUpTask,
  todayStart: number,
  todayEnd: number,
): boolean {
  return (
    task.dueDate != null && task.dueDate >= todayStart && task.dueDate < todayEnd
  );
}

function matchesDue(
  task: ClickUpTask,
  due: DueFilter,
  b: ReturnType<typeof dueBuckets>,
): boolean {
  if (due === "all") return true;
  if (task.dueDate == null) return false;
  if (due === "overdue") return task.dueDate < b.todayStart;
  if (due === "today") return task.dueDate >= b.todayStart && task.dueDate < b.todayEnd;
  // week
  return task.dueDate >= b.todayStart && task.dueDate < b.weekEnd;
}

function compareTasks(a: ClickUpTask, b: ClickUpTask): number {
  // Due date ascending, nulls last; then name.
  if (a.dueDate == null && b.dueDate == null) return a.name.localeCompare(b.name);
  if (a.dueDate == null) return 1;
  if (b.dueDate == null) return -1;
  return a.dueDate - b.dueDate || a.name.localeCompare(b.name);
}

/**
 * Group tasks assigned to me by list, then status — the primary Tasks view.
 * Counts (dueToday/overdue) are computed from the full set so the header is
 * stable regardless of the active filter.
 */
export function groupTasks(
  tasks: ClickUpTask[],
  filters: { due?: DueFilter; priority?: string | null } = {},
): ClickUpGroupedTasks {
  const b = dueBuckets();
  const due = filters.due ?? "all";
  const sprintFolders = getSprintFolderNames();

  const filtered = tasks.filter((t) => {
    if (!matchesDue(t, due, b)) return false;
    if (filters.priority && t.priority?.priority !== filters.priority) return false;
    return true;
  });

  // list id -> group
  const listMap = new Map<string, ClickUpListGroup>();
  // list id -> (status name -> group)
  const statusMap = new Map<string, Map<string, ClickUpStatusGroup>>();

  for (const task of filtered) {
    let list = listMap.get(task.listId);
    if (!list) {
      list = {
        listId: task.listId,
        listName: task.listName,
        folderName: task.folderName,
        isSprint:
          task.folderName != null &&
          sprintFolders.has(task.folderName.toLowerCase()),
        count: 0,
        statuses: [],
      };
      listMap.set(task.listId, list);
      statusMap.set(task.listId, new Map());
    }
    list.count += 1;

    const statuses = statusMap.get(task.listId)!;
    let group = statuses.get(task.status.status);
    if (!group) {
      group = {
        status: task.status.status,
        color: task.status.color,
        type: task.status.type,
        orderindex: task.status.orderindex,
        tasks: [],
      };
      statuses.set(task.status.status, group);
      list.statuses.push(group);
    }
    group.tasks.push(task);
  }

  const groups = [...listMap.values()].sort((a, z) =>
    a.listName.localeCompare(z.listName),
  );
  for (const list of groups) {
    list.statuses.sort((a, z) => a.orderindex - z.orderindex);
    for (const status of list.statuses) status.tasks.sort(compareTasks);
  }

  const flat = [...filtered].sort(compareTasks);

  const lists: ClickUpListOption[] = [
    ...new Map(
      tasks.map((t) => [
        t.listId,
        {
          listId: t.listId,
          listName: t.listName,
          folderName: t.folderName,
          isSprint:
            t.folderName != null &&
            sprintFolders.has(t.folderName.toLowerCase()),
        },
      ]),
    ).values(),
  ].sort((a, z) => a.listName.localeCompare(z.listName));

  const counts = {
    total: tasks.length,
    dueToday: tasks.filter((t) => isDueToday(t, b.todayStart, b.todayEnd)).length,
    overdue: tasks.filter((t) => isOverdue(t, b.todayStart)).length,
    week: tasks.filter(
      (t) => t.dueDate != null && t.dueDate >= b.todayStart && t.dueDate < b.weekEnd,
    ).length,
  };

  return { groups, flat, lists, counts };
}

/** Tasks due today or overdue, overdue first — for the Home widget. */
export function selectTodayTasks(tasks: ClickUpTask[]): ClickUpTask[] {
  const b = dueBuckets();
  return tasks
    .filter(
      (t) =>
        isOverdue(t, b.todayStart) || isDueToday(t, b.todayStart, b.todayEnd),
    )
    .sort(compareTasks);
}

/**
 * Latest sprint = newest ClickUp list in a sprint folder (highest list id).
 * Matches the sort order used in TaskSidebar for sprint folders.
 */
export function selectLatestSprint(data: ClickUpGroupedTasks): {
  list: ClickUpListOption | null;
  tasks: ClickUpTask[];
} {
  const sprintLists = data.lists
    .filter((l) => l.isSprint)
    .sort((a, b) => Number(b.listId) - Number(a.listId));
  const list = sprintLists[0] ?? null;
  if (!list) return { list: null, tasks: [] };

  const tasks = data.flat
    .filter((t) => t.listId === list.listId)
    .sort(compareTasks);
  return { list, tasks };
}
