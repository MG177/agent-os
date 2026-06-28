"use client";

import { memo } from "react";
import { Circle, CircleCheckBig, Loader2 } from "lucide-react";
import { DUE_TONE_CLASS, formatDue } from "@/components/clickup/clickup-format";
import { PriorityFlag } from "@/components/clickup/PriorityFlag";
import type { ClickUpTask } from "@/components/clickup/types";

function TaskRowImpl({
  task,
  selected,
  completing,
  onSelect,
  onComplete,
  showList = false,
}: {
  task: ClickUpTask;
  selected: boolean;
  completing: boolean;
  /** Stable parent callbacks — the row supplies its own ids so React.memo holds. */
  onSelect: (taskId: string) => void;
  onComplete: (taskId: string, listId: string) => void;
  showList?: boolean;
}) {
  const due = formatDue(task.dueDate);

  return (
    <div
      onClick={() => onSelect(task.id)}
      className={`group flex cursor-pointer items-start gap-2.5 border-t border-slate-50 px-3 py-2.5 transition-colors ${
        selected ? "bg-accent/70" : "hover:bg-slate-50"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id, task.listId);
        }}
        disabled={completing}
        aria-label={`Complete ${task.name}`}
        className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-emerald-500 disabled:opacity-50"
      >
        {completing ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          <>
            <Circle className="h-[18px] w-[18px] group-hover:hidden" strokeWidth={1.8} />
            <CircleCheckBig
              className="hidden h-[18px] w-[18px] text-emerald-500 group-hover:block"
              strokeWidth={1.8}
            />
          </>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PriorityFlag priority={task.priority} />
          <p className="truncate text-sm font-medium text-slate-800">
            {task.name}
          </p>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {showList && (
            <span className="text-slate-400">{task.listName}</span>
          )}
          {due && (
            <span className={`font-medium ${DUE_TONE_CLASS[due.tone]}`}>
              {due.label}
            </span>
          )}
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.name}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ color: tag.fg, backgroundColor: tag.bg }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Memoized: only re-renders when this row's own props change, not when a
 *  sibling's selection/completion state flips. */
export const TaskRow = memo(TaskRowImpl);
