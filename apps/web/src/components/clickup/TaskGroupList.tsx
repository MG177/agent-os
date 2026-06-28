"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Zap,
} from "lucide-react";
import { StatusDot } from "@/components/clickup/StatusPill";
import { StatusFilter } from "@/components/clickup/StatusFilter";
import { TaskRow } from "@/components/clickup/TaskRow";
import type {
  ClickUpListGroup,
  ClickUpStatusGroup,
  ClickUpTask,
} from "@/components/clickup/types";

/** Collapse key for the dedicated Sprints parent section. */
const SPRINTS_KEY = "__sprints__";
/** Per-browser status preferences, shared across all lists. */
const LS_HIDDEN_STATUSES = "clickup.hiddenStatuses";
const LS_STATUS_ORDER = "clickup.statusOrder";

// Flattened row model — the nested sprint/list/status/task tree is collapsed
// into a single ordered array so it can be windowed by a single virtualizer.
type FlatRow =
  | { kind: "sprints-header"; key: string; listCount: number; total: number }
  | { kind: "list-header"; key: string; list: ClickUpListGroup; nested: boolean }
  | {
      kind: "status-header";
      key: string;
      status: ClickUpStatusGroup;
      statusKey: string;
      nested: boolean;
    }
  | { kind: "task"; key: string; task: ClickUpTask };

const ESTIMATE: Record<FlatRow["kind"], number> = {
  "sprints-header": 44,
  "list-header": 44,
  "status-header": 32,
  task: 60,
};

export function TaskGroupList({
  groups,
  selectedTaskId,
  completingId,
  onSelect,
  onComplete,
}: {
  groups: ClickUpListGroup[];
  selectedTaskId: string | null;
  completingId: string | null;
  onSelect: (taskId: string) => void;
  onComplete: (taskId: string, listId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());
  const [statusOrder, setStatusOrder] = useState<string[]>([]);

  // Restore status preferences once; they persist across navigated lists.
  useEffect(() => {
    try {
      const h = localStorage.getItem(LS_HIDDEN_STATUSES);
      if (h) setHiddenStatuses(new Set(JSON.parse(h)));
      const o = localStorage.getItem(LS_STATUS_ORDER);
      if (o) setStatusOrder(JSON.parse(o));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Rank a status by the custom order, falling back to its ClickUp orderindex.
  const statusRank = useMemo(() => {
    const index = new Map(statusOrder.map((s, i) => [s, i]));
    return (name: string) => index.get(name) ?? Infinity;
  }, [statusOrder]);

  // Distinct statuses across all visible lists — drives the filter menu.
  const distinctStatuses = useMemo(() => {
    const map = new Map<string, { status: string; color: string; orderindex: number }>();
    for (const list of groups) {
      for (const s of list.statuses) {
        if (!map.has(s.status)) {
          map.set(s.status, { status: s.status, color: s.color, orderindex: s.orderindex });
        }
      }
    }
    return [...map.values()].sort((a, b) => {
      const ra = statusRank(a.status);
      const rb = statusRank(b.status);
      return ra !== rb ? ra - rb : a.orderindex - b.orderindex;
    });
  }, [groups, statusRank]);

  function toggleStatus(status: string) {
    const next = new Set(hiddenStatuses);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setHiddenStatuses(next);
    try {
      localStorage.setItem(LS_HIDDEN_STATUSES, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  function reorderStatus(from: string, to: string) {
    if (from === to) return;
    const order = distinctStatuses.map((s) => s.status);
    const fi = order.indexOf(from);
    const ti = order.indexOf(to);
    if (fi === -1 || ti === -1) return;
    order.splice(fi, 1);
    order.splice(ti, 0, from);
    setStatusOrder(order);
    try {
      localStorage.setItem(LS_STATUS_ORDER, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }

  function resetStatusPrefs() {
    setHiddenStatuses(new Set());
    setStatusOrder([]);
    try {
      localStorage.removeItem(LS_HIDDEN_STATUSES);
      localStorage.removeItem(LS_STATUS_ORDER);
    } catch {
      /* ignore */
    }
  }

  // Apply the status filter + order, then drop lists with nothing left to show.
  const displayGroups = useMemo(
    () =>
      groups
        .map((list) => {
          const statuses = list.statuses
            .filter((s) => !hiddenStatuses.has(s.status))
            .sort((a, b) => {
              const ra = statusRank(a.status);
              const rb = statusRank(b.status);
              return ra !== rb ? ra - rb : a.orderindex - b.orderindex;
            });
          const count = statuses.reduce((n, s) => n + s.tasks.length, 0);
          return { ...list, statuses, count };
        })
        .filter((list) => list.statuses.length > 0),
    [groups, hiddenStatuses, statusRank],
  );

  const sprintGroups = useMemo(
    () => displayGroups.filter((g) => g.isSprint),
    [displayGroups],
  );
  const normalGroups = useMemo(
    () => displayGroups.filter((g) => !g.isSprint),
    [displayGroups],
  );
  const sprintTotal = sprintGroups.reduce((n, g) => n + g.count, 0);

  // Every collapsible key, for the collapse/expand switch.
  const allKeys = useMemo(
    () => [
      ...(sprintGroups.length > 0 ? [SPRINTS_KEY] : []),
      ...displayGroups.map((g) => g.listId),
    ],
    [sprintGroups.length, displayGroups],
  );
  const allCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));

  // Flatten the visible (un-collapsed) tree into the windowed row list.
  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];

    const pushList = (list: ClickUpListGroup, nested: boolean) => {
      rows.push({ kind: "list-header", key: `lh:${list.listId}`, list, nested });
      if (collapsed.has(list.listId)) return;
      for (const status of list.statuses) {
        const statusKey = `${list.listId}::s::${status.status}`;
        rows.push({
          kind: "status-header",
          key: `sh:${statusKey}`,
          status,
          statusKey,
          nested,
        });
        if (collapsed.has(statusKey)) continue;
        for (const task of status.tasks) {
          rows.push({ kind: "task", key: `t:${task.id}`, task });
        }
      }
    };

    if (sprintGroups.length > 0) {
      rows.push({
        kind: "sprints-header",
        key: SPRINTS_KEY,
        listCount: sprintGroups.length,
        total: sprintTotal,
      });
      if (!collapsed.has(SPRINTS_KEY)) {
        for (const list of sprintGroups) pushList(list, true);
      }
    }
    for (const list of normalGroups) pushList(list, false);

    return rows;
  }, [sprintGroups, normalGroups, sprintTotal, collapsed]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => ESTIMATE[flatRows[i].kind],
    overscan: 10,
    getItemKey: (i) => flatRows[i].key,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-1">
        <StatusFilter
          statuses={distinctStatuses}
          hidden={hiddenStatuses}
          onToggle={toggleStatus}
          onReorder={reorderStatus}
          onReset={resetStatusPrefs}
        />
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allKeys))}
          disabled={allKeys.length === 0}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {allCollapsed ? (
            <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.8} />
          ) : (
            <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      {displayGroups.length === 0 ? (
        <div className="app-card text-center">
          <p className="text-sm font-semibold text-slate-700">Nothing to show</p>
          <p className="mt-1 text-xs text-slate-500">
            Every status is hidden. Adjust the Status filter.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="app-card min-h-0 flex-1 overflow-y-auto overscroll-contain p-0"
        >
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualItems.map((vi) => {
              const row = flatRows[vi.index];
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  {row.kind === "sprints-header" ? (
                    <SprintsHeader
                      collapsed={collapsed.has(SPRINTS_KEY)}
                      listCount={row.listCount}
                      total={row.total}
                      onToggle={toggle}
                    />
                  ) : row.kind === "list-header" ? (
                    <ListHeader
                      list={row.list}
                      nested={row.nested}
                      collapsed={collapsed.has(row.list.listId)}
                      onToggle={toggle}
                    />
                  ) : row.kind === "status-header" ? (
                    <StatusHeader
                      status={row.status}
                      nested={row.nested}
                      collapsed={collapsed.has(row.statusKey)}
                      statusKey={row.statusKey}
                      onToggle={toggle}
                    />
                  ) : (
                    <TaskRow
                      task={row.task}
                      selected={row.task.id === selectedTaskId}
                      completing={row.task.id === completingId}
                      onSelect={onSelect}
                      onComplete={onComplete}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const SprintsHeader = memo(function SprintsHeader({
  collapsed,
  listCount,
  total,
  onToggle,
}: {
  collapsed: boolean;
  listCount: number;
  total: number;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(SPRINTS_KEY)}
      className="flex w-full items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      )}
      <Zap className="h-4 w-4 shrink-0 text-violet-500" strokeWidth={1.8} />
      <span className="text-sm font-semibold text-slate-900">Sprints</span>
      <span className="text-xs text-slate-400">
        {listCount} {listCount === 1 ? "list" : "lists"}
      </span>
      <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-600">
        {total}
      </span>
    </button>
  );
});

const ListHeader = memo(function ListHeader({
  list,
  nested,
  collapsed,
  onToggle,
}: {
  list: ClickUpListGroup;
  nested: boolean;
  collapsed: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(list.listId)}
      className={`flex w-full items-center gap-2 border-b border-slate-100 bg-white py-2.5 pr-3 text-left transition-colors hover:bg-slate-50 ${
        nested ? "pl-7" : "pl-3"
      }`}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      )}
      <span className="truncate text-sm font-semibold text-slate-900">
        {list.listName}
      </span>
      {!nested && list.folderName && (
        <span className="truncate text-xs text-slate-400">{list.folderName}</span>
      )}
      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-500">
        {list.count}
      </span>
    </button>
  );
});

const StatusHeader = memo(function StatusHeader({
  status,
  nested,
  collapsed,
  statusKey,
  onToggle,
}: {
  status: ClickUpStatusGroup;
  nested: boolean;
  collapsed: boolean;
  statusKey: string;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(statusKey)}
      className={`flex w-full items-center gap-1.5 border-b border-slate-100 bg-slate-50/60 py-1.5 pr-3 text-left transition-colors hover:bg-slate-100 ${
        nested ? "pl-7" : "pl-3"
      }`}
    >
      {collapsed ? (
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      )}
      <StatusDot color={status.color} />
      <span
        className="text-[11px] font-bold uppercase tracking-wide"
        style={{ color: status.color }}
      >
        {status.status}
      </span>
      <span className="text-[11px] font-medium tabular-nums text-slate-400">
        {status.tasks.length}
      </span>
    </button>
  );
});
