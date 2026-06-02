"use client";

import { useState } from "react";
import {
  Check,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlarmClock,
  Clock,
  Repeat,
} from "lucide-react";
import type { TodoDoc } from "@/lib/todos";
import { dueState, dueChipClass, formatClock } from "@/lib/todo-format";

interface Handlers {
  onDone: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: TodoDoc) => void;
}

function recurringSummary(todo: TodoDoc): string {
  return (
    todo.triggers
      ?.map((t) => t.label)
      .filter(Boolean)
      .join(" · ") ?? ""
  );
}

function nextRun(todo: TodoDoc): number {
  return todo.nextRunAt ? new Date(todo.nextRunAt).getTime() : Infinity;
}

// ── Shared row controls ────────────────────────────────────────────────

function DoneCircle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Mark done"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
    >
      <Check strokeWidth={2.5} className="h-3 w-3" />
    </button>
  );
}

function RowActions({ todo, onToggle, onDelete, onEdit }: { todo: TodoDoc } & Omit<Handlers, "onDone">) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {todo.type === "recurring" && (
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
      <button
        type="button"
        onClick={() => onEdit(todo)}
        title="Edit"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Pencil strokeWidth={1.8} className="h-3.5 w-3.5" />
      </button>
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
  );
}

// ── Panel shell ────────────────────────────────────────────────────────

function Panel({
  icon,
  title,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`app-card flex flex-col p-4 md:p-5 ${accent ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {count}
        </span>
      </div>
      <div className="-mr-1 flex-1 space-y-1.5 overflow-y-auto pr-1 lg:max-h-[62vh]">
        {children}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-slate-400">{children}</p>;
}

// ── Stat strip ─────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "red" | "violet";
}) {
  const styles = {
    slate: { card: "border-slate-100 bg-white", label: "text-slate-400", value: "text-slate-900" },
    red: { card: "border-red-100 bg-red-50/50", label: "text-red-400", value: "text-red-600" },
    violet: { card: "border-slate-100 bg-white", label: "text-slate-400", value: "text-violet-600" },
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles.card}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.label}`}>{label}</p>
      <p className={`mt-1 text-3xl font-bold md:text-4xl ${styles.value}`}>{value}</p>
    </div>
  );
}

// ── Command center ─────────────────────────────────────────────────────

export function TodoCommandCenter({
  todos,
  onDone,
  onToggle,
  onDelete,
  onEdit,
}: { todos: TodoDoc[] } & Handlers) {
  const now = Date.now();

  const overdue = todos
    .filter((t) => t.enabled && t.nextRunAt && new Date(t.nextRunAt).getTime() < now)
    .sort((a, b) => nextRun(a) - nextRun(b));

  const upcoming = todos
    .filter(
      (t) =>
        t.type === "once" &&
        !(t.nextRunAt && new Date(t.nextRunAt).getTime() < now),
    )
    .sort((a, b) => nextRun(a) - nextRun(b));

  const recurring = todos
    .filter((t) => t.type === "recurring")
    .sort((a, b) => nextRun(a) - nextRun(b));

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Active" value={todos.length} />
        <StatTile label="Overdue" value={overdue.length} tone="red" />
        <StatTile label="Recurring" value={recurring.length} tone="violet" />
      </div>

      {/* Panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Needs attention */}
        <Panel
          icon={<AlarmClock strokeWidth={1.8} className="h-4 w-4 text-red-500" />}
          title="Needs attention"
          count={overdue.length}
          accent={overdue.length ? "border-red-200" : undefined}
        >
          {overdue.length === 0 ? (
            <EmptyHint>Nothing overdue — you&apos;re on track</EmptyHint>
          ) : (
            overdue.map((todo) => {
              const due = dueState(todo.nextRunAt ? new Date(todo.nextRunAt) : undefined);
              return (
                <div
                  key={todo._id}
                  className="flex items-center gap-3 rounded-2xl bg-red-50/60 px-3 py-2"
                >
                  <DoneCircle onClick={() => onDone(todo._id)} />
                  <button
                    type="button"
                    onClick={() => onEdit(todo)}
                    className="min-w-0 flex-1 text-left"
                    title="Edit"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{todo.title}</p>
                    {due && (
                      <p className="text-[11px] font-semibold text-red-600">{due.label}</p>
                    )}
                  </button>
                  <RowActions todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
                </div>
              );
            })
          )}
        </Panel>

        {/* Upcoming */}
        <Panel
          icon={<Clock strokeWidth={1.8} className="h-4 w-4 text-blue-500" />}
          title="Upcoming"
          count={upcoming.length}
        >
          {upcoming.length === 0 ? (
            <EmptyHint>No upcoming one-time tasks</EmptyHint>
          ) : (
            upcoming.map((todo) => {
              const next = todo.nextRunAt ? new Date(todo.nextRunAt) : undefined;
              const due = dueState(next);
              return (
                <div
                  key={todo._id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-slate-50"
                >
                  <DoneCircle onClick={() => onDone(todo._id)} />
                  <button
                    type="button"
                    onClick={() => onEdit(todo)}
                    className="min-w-0 flex-1 text-left"
                    title="Edit"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{todo.title}</p>
                    {next && (
                      <p className="text-[11px] text-slate-400">{formatClock(next)}</p>
                    )}
                  </button>
                  {due && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueChipClass(due.tone)}`}
                    >
                      {due.label}
                    </span>
                  )}
                  <RowActions todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
                </div>
              );
            })
          )}
        </Panel>

        {/* Recurring habits */}
        <Panel
          icon={<Repeat strokeWidth={1.8} className="h-4 w-4 text-violet-500" />}
          title="Recurring habits"
          count={recurring.length}
        >
          {recurring.length === 0 ? (
            <EmptyHint>No recurring habits yet</EmptyHint>
          ) : (
            recurring.map((todo) => {
              const summary = recurringSummary(todo);
              return (
                <div
                  key={todo._id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-slate-50 ${
                    todo.enabled ? "" : "opacity-60"
                  }`}
                >
                  <DoneCircle onClick={() => onDone(todo._id)} />
                  <button
                    type="button"
                    onClick={() => onEdit(todo)}
                    className="min-w-0 flex-1 text-left"
                    title="Edit"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{todo.title}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {todo.enabled ? summary || "Recurring" : "Paused"}
                    </p>
                  </button>
                  <RowActions todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}
