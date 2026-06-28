"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  ListTodo,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ClickUpListOption } from "@/components/clickup/types";

/** Sprint folders show only this many of their newest lists by default. */
const SPRINT_VISIBLE = 3;

/** Remembers the user's custom folder order per-browser. */
const LS_FOLDER_ORDER = "clickup.folderOrder";

type Due = "all" | "overdue" | "today" | "week";

interface Counts {
  total: number;
  dueToday: number;
  overdue: number;
  week: number;
}

const VIEWS: { key: Due; label: string; Icon: LucideIcon; countKey: keyof Counts }[] = [
  { key: "all", label: "All tasks", Icon: ListTodo, countKey: "total" },
  { key: "overdue", label: "Overdue", Icon: AlertTriangle, countKey: "overdue" },
  { key: "today", label: "Today", Icon: Sun, countKey: "dueToday" },
  { key: "week", label: "This week", Icon: CalendarClock, countKey: "week" },
];

/**
 * Contextual left rail for the Tasks workspace (shown lg+): saved due-date
 * views, per-list navigation, and the workspace switcher. The global app nav
 * lives in the separate DesktopSidebar; this rail sits inside the page.
 */
export function TaskSidebar({
  due,
  onDueChange,
  counts,
  lists,
  listCounts,
  activeListId,
  onSelectList,
  workspaces,
  activeTeamId,
  switching,
  onSwitchWorkspace,
}: {
  due: Due;
  onDueChange: (due: Due) => void;
  counts: Counts | null;
  lists: ClickUpListOption[];
  listCounts: Map<string, number>;
  activeListId: string | null;
  onSelectList: (listId: string | null) => void;
  workspaces: { id: string; name: string }[];
  activeTeamId: string | null;
  switching: boolean;
  onSwitchWorkspace: (teamId: string) => void;
}) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [dragFolder, setDragFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Restore the custom folder order on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FOLDER_ORDER);
      if (raw) setFolderOrder(JSON.parse(raw));
    } catch {
      /* ignore (private mode / bad JSON) */
    }
  }, []);

  function persistFolderOrder(order: string[]) {
    setFolderOrder(order);
    try {
      localStorage.setItem(LS_FOLDER_ORDER, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }

  function toggleFolder(name: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleSprintExpand(name: string) {
    setExpandedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Group lists by folder (lists arrive sorted by name). Sprint folders pin to
  // the top, then other folders alphabetically; folderless lists render below.
  const { folderGroups, folderless } = useMemo(() => {
    const map = new Map<
      string,
      { folder: string; isSprint: boolean; lists: ClickUpListOption[] }
    >();
    const loose: ClickUpListOption[] = [];
    for (const list of lists) {
      if (list.folderName) {
        const g = map.get(list.folderName);
        if (g) g.lists.push(list);
        else
          map.set(list.folderName, {
            folder: list.folderName,
            isSprint: list.isSprint,
            lists: [list],
          });
      } else {
        loose.push(list);
      }
    }
    const orderIndex = (name: string) => {
      const i = folderOrder.indexOf(name);
      return i === -1 ? Infinity : i;
    };
    const groups = [...map.values()].sort((a, b) => {
      const ia = orderIndex(a.folder);
      const ib = orderIndex(b.folder);
      if (ia !== ib) return ia - ib; // explicit custom order wins
      if (a.isSprint !== b.isSprint) return a.isSprint ? -1 : 1; // then sprints
      return a.folder.localeCompare(b.folder); // then alphabetical
    });
    return { folderGroups: groups, folderless: loose };
  }, [lists, folderOrder]);

  // Move `from` to `to`'s slot, capturing the full current order so it sticks.
  function reorderFolders(from: string | null, to: string) {
    if (!from || from === to) return;
    const order = folderGroups.map((g) => g.folder);
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, from);
    persistFolderOrder(order);
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-3 shadow-sm lg:flex xl:w-64">
      {/* Views */}
      <div>
        <p className="app-section-label px-1 pb-1.5">Views</p>
        <nav className="space-y-0.5">
          {VIEWS.map(({ key, label, Icon, countKey }) => {
            const active = due === key;
            const count = counts?.[countKey] ?? 0;
            const overdue = key === "overdue" && count > 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onDueChange(key)}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-accent font-semibold text-primary"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    overdue ? "text-rose-500" : active ? "text-primary" : "text-slate-400"
                  }`}
                  strokeWidth={1.8}
                />
                <span className="flex-1 truncate">{label}</span>
                <CountBadge count={count} active={active} tone={overdue ? "rose" : "default"} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Lists */}
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="app-section-label px-1 pb-1.5">Lists</p>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => onSelectList(null)}
            className={`flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors ${
              activeListId === null
                ? "bg-accent font-semibold text-primary"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="flex-1 truncate">All lists</span>
          </button>

          {folderGroups.map(({ folder, isSprint, lists: folderLists }) => {
            const collapsed = collapsedFolders.has(folder);
            const folderCount = folderLists.reduce(
              (n, l) => n + (listCounts.get(l.listId) ?? 0),
              0,
            );

            // Sprint folders: newest lists first (ClickUp ids increase over
            // time), capped to SPRINT_VISIBLE unless expanded — or auto-expanded
            // when the active list is one of the hidden older sprints.
            const ordered = isSprint
              ? [...folderLists].sort((a, b) => Number(b.listId) - Number(a.listId))
              : folderLists;
            const expanded =
              expandedSprints.has(folder) ||
              (isSprint &&
                activeListId != null &&
                ordered.slice(SPRINT_VISIBLE).some((l) => l.listId === activeListId));
            const visible =
              isSprint && !expanded ? ordered.slice(0, SPRINT_VISIBLE) : ordered;
            const hidden = ordered.length - visible.length;

            return (
              <div
                key={folder}
                onDragOver={(e) => {
                  if (!dragFolder || dragFolder === folder) return;
                  e.preventDefault();
                  setDragOverFolder(folder);
                }}
                onDragLeave={() =>
                  setDragOverFolder((f) => (f === folder ? null : f))
                }
                onDrop={(e) => {
                  e.preventDefault();
                  reorderFolders(dragFolder, folder);
                  setDragOverFolder(null);
                }}
                className={`rounded-2xl ${
                  dragOverFolder === folder ? "ring-2 ring-ring" : ""
                } ${dragFolder === folder ? "opacity-50" : ""}`}
              >
                <div className="group flex items-center rounded-2xl transition-colors hover:bg-slate-50">
                  <span
                    draggable
                    onDragStart={() => setDragFolder(folder)}
                    onDragEnd={() => {
                      setDragFolder(null);
                      setDragOverFolder(null);
                    }}
                    aria-label={`Drag ${folder} to reorder`}
                    className="cursor-grab px-1 py-2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-2 pr-2 text-left"
                  >
                    {collapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                    {isSprint ? (
                      <Zap className="h-3.5 w-3.5 shrink-0 text-violet-500" strokeWidth={1.8} />
                    ) : (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.8} />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                      {folder}
                    </span>
                    <CountBadge
                      count={folderCount}
                      active={false}
                      tone={isSprint ? "violet" : "default"}
                    />
                  </button>
                </div>
                {!collapsed && (
                  <>
                    {visible.map((list) => (
                      <ListRow
                        key={list.listId}
                        list={list}
                        count={listCounts.get(list.listId) ?? 0}
                        active={activeListId === list.listId}
                        nested
                        onSelect={() => onSelectList(list.listId)}
                      />
                    ))}
                    {isSprint && ordered.length > SPRINT_VISIBLE && (
                      <button
                        type="button"
                        onClick={() => toggleSprintExpand(folder)}
                        className="flex w-full items-center rounded-2xl py-1.5 pl-8 pr-2.5 text-left text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                      >
                        {expanded ? "Show fewer" : `+${hidden} older sprint${hidden === 1 ? "" : "s"}`}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {folderless.map((list) => (
            <ListRow
              key={list.listId}
              list={list}
              count={listCounts.get(list.listId) ?? 0}
              active={activeListId === list.listId}
              onSelect={() => onSelectList(list.listId)}
            />
          ))}
        </nav>
      </div>

      {/* Workspace */}
      {workspaces.length > 1 && (
        <div>
          <p className="app-section-label px-1 pb-1.5">Workspace</p>
          <select
            value={activeTeamId ?? ""}
            disabled={switching}
            onChange={(e) => onSwitchWorkspace(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            aria-label="Workspace"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </aside>
  );
}

function ListRow({
  list,
  count,
  active,
  nested = false,
  onSelect,
}: {
  list: ClickUpListOption;
  count: number;
  active: boolean;
  nested?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-2xl py-2 pr-2.5 text-left text-sm transition-colors ${
        nested ? "pl-8" : "pl-2.5"
      } ${
        active
          ? "bg-accent font-semibold text-primary"
          : `text-slate-600 hover:bg-slate-50 ${count === 0 ? "opacity-50" : ""}`
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{list.listName}</span>
      <CountBadge count={count} active={active} tone="default" />
    </button>
  );
}

function CountBadge({
  count,
  active,
  tone,
}: {
  count: number;
  active: boolean;
  tone: "default" | "rose" | "violet";
}) {
  const cls = active
    ? "bg-accent text-primary"
    : tone === "rose"
      ? "bg-rose-50 text-rose-600"
      : tone === "violet"
        ? "bg-violet-50 text-violet-600"
        : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}
    >
      {count}
    </span>
  );
}
