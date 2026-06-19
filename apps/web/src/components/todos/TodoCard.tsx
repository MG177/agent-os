"use client";

import { useState } from "react";
import { Check, Trash2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import type { TodoDoc } from "@/lib/todos";

function dueChip(nextRunAt: Date | undefined, completedAt: Date | undefined) {
  if (completedAt) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        Done
      </span>
    );
  }
  if (!nextRunAt) return null;
  const now = Date.now();
  const ms = new Date(nextRunAt).getTime() - now;
  const overdue = ms < 0;
  const dueSoon = ms >= 0 && ms < 2 * 60 * 60 * 1000;

  if (overdue) {
    const ago = Math.round(Math.abs(ms) / 60000);
    const label = ago < 60 ? `${ago}m overdue` : `${Math.round(ago / 60)}h overdue`;
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        {label}
      </span>
    );
  }
  if (dueSoon) {
    const mins = Math.round(ms / 60000);
    const label = mins < 60 ? `in ${mins}m` : `in ${Math.round(mins / 60)}h`;
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        {label}
      </span>
    );
  }
  const label = formatRelative(new Date(nextRunAt));
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
      {label}
    </span>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

interface Props {
  todo: TodoDoc;
  onDone: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: TodoDoc) => void;
}

export function TodoCard({ todo, onDone, onToggle, onDelete, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDone = !!todo.completedAt;
  const triggerLabels =
    todo.type === "recurring" && todo.triggers?.length
      ? todo.triggers.map((t) => t.label).filter(Boolean)
      : [];
  const onceDateLabel =
    todo.type === "once" && todo.dueAt
      ? new Date(todo.dueAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  return (
    <div
      className={`app-card flex items-start gap-3 py-3 transition-opacity ${
        isDone || !todo.enabled ? "opacity-60" : ""
      }`}
    >
      {/* Done button */}
      {!isDone && (
        <button
          type="button"
          onClick={() => onDone(todo._id)}
          title="Mark done"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
        >
          <Check strokeWidth={2.5} className="h-3 w-3" />
        </button>
      )}
      {isDone && (
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check strokeWidth={2.5} className="h-3 w-3" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium text-slate-900 ${isDone ? "line-through" : ""}`}>
          {todo.title}
        </p>
        {todo.notes && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{todo.notes}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {triggerLabels.map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {label}
            </span>
          ))}
          {onceDateLabel && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {onceDateLabel}
            </span>
          )}
          {dueChip(todo.nextRunAt ? new Date(todo.nextRunAt) : undefined, todo.completedAt ? new Date(todo.completedAt) : undefined)}
          {todo.type === "recurring" && !todo.enabled && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              Paused
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {todo.type === "recurring" && !isDone && (
          <button
            type="button"
            onClick={() => onToggle(todo._id, !todo.enabled)}
            title={todo.enabled ? "Pause" : "Resume"}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {todo.enabled ? (
              <ToggleRight strokeWidth={1.8} className="h-4 w-4 text-blue-500" />
            ) : (
              <ToggleLeft strokeWidth={1.8} className="h-4 w-4" />
            )}
          </button>
        )}
        {!isDone && (
          <button
            type="button"
            onClick={() => onEdit(todo)}
            title="Edit"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil strokeWidth={1.8} className="h-3.5 w-3.5" />
          </button>
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(todo._id)}
              className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 strokeWidth={1.8} className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
