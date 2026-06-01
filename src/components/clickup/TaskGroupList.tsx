"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { ClickUpListGroup } from "@/components/clickup/types";

/** Collapse key for the dedicated Sprints parent section. */
const SPRINTS_KEY = "__sprints__";
/** Per-browser status preferences, shared across all lists. */
const LS_HIDDEN_STATUSES = "clickup.hiddenStatuses";
const LS_STATUS_ORDER = "clickup.statusOrder";

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

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  const sprintGroups = displayGroups.filter((g) => g.isSprint);
  const normalGroups = displayGroups.filter((g) => !g.isSprint);
  const sprintTotal = sprintGroups.reduce((n, g) => n + g.count, 0);

  // Every collapsible key, for the collapse/expand switch.
  const allKeys = [
    ...(sprintGroups.length > 0 ? [SPRINTS_KEY] : []),
    ...displayGroups.map((g) => g.listId),
  ];
  const allCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsed.has(k));

  const taskProps = { selectedTaskId, completingId, onSelect, onComplete };

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-1 bg-slate-50/90 py-1 backdrop-blur-sm">
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
          <p className="mt-1 text-xs text-slate-400">
            Every status is hidden — adjust the Status filter.
          </p>
        </div>
      ) : (
        <>
          {sprintGroups.length > 0 && (
            <section className="app-card overflow-hidden p-0">
              <button
                type="button"
                onClick={() => toggle(SPRINTS_KEY)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
              >
                {collapsed.has(SPRINTS_KEY) ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <Zap className="h-4 w-4 shrink-0 text-violet-500" strokeWidth={1.8} />
                <span className="text-sm font-semibold text-slate-900">Sprints</span>
                <span className="text-xs text-slate-400">
                  {sprintGroups.length} {sprintGroups.length === 1 ? "list" : "lists"}
                </span>
                <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-600">
                  {sprintTotal}
                </span>
              </button>

              {!collapsed.has(SPRINTS_KEY) && (
                <div className="border-t border-slate-100">
                  {sprintGroups.map((list) => (
                    <ListGroupSection
                      key={list.listId}
                      list={list}
                      nested
                      collapsed={collapsed}
                      onToggle={toggle}
                      {...taskProps}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {normalGroups.map((list) => (
            <ListGroupSection
              key={list.listId}
              list={list}
              collapsed={collapsed}
              onToggle={toggle}
              {...taskProps}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** One list, grouped by status. `nested` renders it inside the Sprints card. */
function ListGroupSection({
  list,
  nested = false,
  collapsed,
  onToggle,
  selectedTaskId,
  completingId,
  onSelect,
  onComplete,
}: {
  list: ClickUpListGroup;
  nested?: boolean;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  selectedTaskId: string | null;
  completingId: string | null;
  onSelect: (taskId: string) => void;
  onComplete: (taskId: string, listId: string) => void;
}) {
  const isCollapsed = collapsed.has(list.listId);
  const indent = nested ? "pl-7" : "pl-3";

  return (
    <section
      className={
        nested
          ? "border-t border-slate-100 first:border-t-0"
          : "app-card overflow-hidden p-0"
      }
    >
      <button
        type="button"
        onClick={() => onToggle(list.listId)}
        className={`flex w-full items-center gap-2 py-2.5 pr-3 text-left transition-colors hover:bg-slate-50 ${indent}`}
      >
        {isCollapsed ? (
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

      {!isCollapsed &&
        list.statuses.map((status) => {
          const statusKey = `${list.listId}::s::${status.status}`;
          const statusCollapsed = collapsed.has(statusKey);
          return (
            <div key={status.status} className="border-t border-slate-100">
              <button
                type="button"
                onClick={() => onToggle(statusKey)}
                className={`flex w-full items-center gap-1.5 bg-slate-50/60 py-1.5 pr-3 text-left transition-colors hover:bg-slate-100 ${indent}`}
              >
                {statusCollapsed ? (
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
              {!statusCollapsed && (
                <ul className="divide-y divide-slate-50">
                  {status.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      completing={task.id === completingId}
                      onSelect={() => onSelect(task.id)}
                      onComplete={() => onComplete(task.id, task.listId)}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
    </section>
  );
}
