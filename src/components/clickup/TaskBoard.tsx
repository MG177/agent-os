"use client";

import { useMemo } from "react";
import { StatusDot } from "@/components/clickup/StatusPill";
import { TaskCard } from "@/components/clickup/TaskCard";
import type { ClickUpTask } from "@/components/clickup/types";

interface Column {
  status: string;
  color: string;
  orderindex: number;
  tasks: ClickUpTask[];
}

/** Kanban board grouping all my tasks by status across lists. */
export function TaskBoard({
  tasks,
  selectedTaskId,
  completingId,
  onSelect,
  onComplete,
}: {
  tasks: ClickUpTask[];
  selectedTaskId: string | null;
  completingId: string | null;
  onSelect: (taskId: string) => void;
  onComplete: (taskId: string, listId: string) => void;
}) {
  const columns = useMemo<Column[]>(() => {
    const map = new Map<string, Column>();
    for (const task of tasks) {
      const key = task.status.status;
      let col = map.get(key);
      if (!col) {
        col = {
          status: task.status.status,
          color: task.status.color,
          orderindex: task.status.orderindex,
          tasks: [],
        };
        map.set(key, col);
      }
      col.orderindex = Math.min(col.orderindex, task.status.orderindex);
      col.tasks.push(task);
    }
    return [...map.values()].sort((a, b) => a.orderindex - b.orderindex);
  }, [tasks]);

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div
          key={col.status}
          className="flex w-72 shrink-0 flex-col rounded-3xl bg-slate-50/70 p-2"
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <StatusDot color={col.color} />
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: col.color }}
            >
              {col.status}
            </span>
            <span className="text-xs font-medium tabular-nums text-slate-400">
              {col.tasks.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto px-0.5 pb-1">
            {col.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selected={task.id === selectedTaskId}
                completing={task.id === completingId}
                onSelect={onSelect}
                onComplete={onComplete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
