"use client";

import { Circle, CircleCheckBig, Loader2 } from "lucide-react";
import { DUE_TONE_CLASS, formatDue } from "@/components/clickup/clickup-format";
import { PriorityFlag } from "@/components/clickup/PriorityFlag";
import type { ClickUpTask } from "@/components/clickup/types";

export function TaskRow({
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
  onSelect: () => void;
  onComplete: () => void;
  showList?: boolean;
}) {
  const due = formatDue(task.dueDate);

  return (
    <li
      onClick={onSelect}
      className={`group flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors ${
        selected ? "bg-blue-50/70" : "hover:bg-slate-50"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
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
    </li>
  );
}
