"use client";

import { Circle, CircleCheckBig, Loader2 } from "lucide-react";
import { DUE_TONE_CLASS, formatDue } from "@/components/clickup/clickup-format";
import { PriorityFlag } from "@/components/clickup/PriorityFlag";
import type { ClickUpTask } from "@/components/clickup/types";

export function TaskCard({
  task,
  selected,
  completing,
  onSelect,
  onComplete,
}: {
  task: ClickUpTask;
  selected: boolean;
  completing: boolean;
  onSelect: () => void;
  onComplete: () => void;
}) {
  const due = formatDue(task.dueDate);

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer rounded-2xl border bg-white p-3 shadow-sm transition-colors ${
        selected
          ? "border-blue-300 ring-1 ring-blue-200"
          : "border-slate-100 hover:border-slate-200"
      }`}
    >
      <div className="flex items-start gap-2">
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Circle className="h-4 w-4 group-hover:hidden" strokeWidth={1.8} />
              <CircleCheckBig
                className="hidden h-4 w-4 text-emerald-500 group-hover:block"
                strokeWidth={1.8}
              />
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PriorityFlag priority={task.priority} />
            <p className="line-clamp-2 text-sm font-medium text-slate-800">
              {task.name}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="truncate text-slate-400">{task.listName}</span>
            {due && (
              <span className={`font-medium ${DUE_TONE_CLASS[due.tone]}`}>
                {due.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
