"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ListTodo,
  Repeat,
} from "lucide-react";
import type { TodoDoc } from "@/lib/todos";
import { dueState, dueChipClass, formatClock } from "@/lib/todo-format";

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

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

/** Subtitle line: schedule summary for recurring, date+time for one-time. */
function itemSubtitle(todo: TodoDoc): string {
  if (todo.type === "recurring") return recurringSummary(todo) || "Recurring";
  if (todo.nextRunAt) {
    return new Date(todo.nextRunAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return "";
}

// ── Shared row controls ────────────────────────────────────────────────

function DoneCircle({ checked = false, onClick }: { checked?: boolean; onClick: () => void }) {
  if (checked) {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check strokeWidth={2.5} className="h-3 w-3" />
      </div>
    );
  }
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

function RowActions({
  todo,
  showToggle = false,
  onToggle,
  onDelete,
  onEdit,
}: { todo: TodoDoc; showToggle?: boolean } & Omit<Handlers, "onDone">) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {showToggle && todo.type === "recurring" && (
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
  subtitle,
  count,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`app-card flex flex-col p-4 md:p-5 ${accent ?? ""}`}>
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {count}
        </span>
      </div>
      <div className="flex-1">{children}</div>
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

// ── Todo row ───────────────────────────────────────────────────────────

function TodoRow({
  todo,
  justDone = false,
  onDone,
  onToggle,
  onDelete,
  onEdit,
}: { todo: TodoDoc; justDone?: boolean } & Handlers) {
  const next = todo.nextRunAt ? new Date(todo.nextRunAt) : undefined;
  const due = dueState(next);
  const overdue = due?.tone === "overdue";
  const lastDone = todo.lastDoneAt ? new Date(todo.lastDoneAt) : undefined;
  const doneToday = lastDone && isToday(lastDone);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors ${
        justDone ? "bg-emerald-50/70" : overdue ? "bg-red-50/60" : "hover:bg-slate-50"
      }`}
    >
      <DoneCircle checked={justDone} onClick={() => onDone(todo._id)} />
      <button
        type="button"
        onClick={() => onEdit(todo)}
        className={`min-w-0 flex-1 text-left ${justDone ? "opacity-60" : ""}`}
        title="Edit"
      >
        <div className="flex items-center gap-1.5">
          {todo.type === "recurring" && (
            <Repeat strokeWidth={1.8} className="h-3 w-3 shrink-0 text-violet-400" />
          )}
          <p className="truncate text-sm font-medium text-slate-900">{todo.title}</p>
        </div>
        <p className="truncate text-[11px] text-slate-400">{itemSubtitle(todo)}</p>
      </button>
      {justDone ? (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          Done
        </span>
      ) : (
        <>
          {doneToday && (
            <span
              title={`Last done ${formatClock(lastDone)}`}
              className="flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"
            >
              <Check strokeWidth={2.5} className="h-2.5 w-2.5" />
              {formatClock(lastDone)}
            </span>
          )}
          {due && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueChipClass(due.tone)}`}
            >
              {due.label}
            </span>
          )}
        </>
      )}
      <RowActions todo={todo} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />
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

  // Optimistic "just completed" set — gives the check an instant, visible
  // effect (green + slide to bottom) even when a recurring reminder's next
  // run is unchanged by completing it.
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleDone = useCallback(
    (id: string) => {
      setJustDone((prev) => new Set(prev).add(id));
      onDone(id);
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        setJustDone((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        delete timers.current[id];
      }, 2200);
    },
    [onDone],
  );

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  // Todo = every active (enabled, non-paused) item on a timeline, soonest
  // first — but a just-completed item drops to the bottom.
  const todoItems = todos
    .filter((t) => t.enabled && t.nextRunAt)
    .sort((a, b) => {
      const ad = justDone.has(a._id) ? 1 : 0;
      const bd = justDone.has(b._id) ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return nextRun(a) - nextRun(b);
    });

  const overdueCount = todoItems.filter(
    (t) => !justDone.has(t._id) && new Date(t.nextRunAt!).getTime() < now,
  ).length;

  // Manage = the recurring rules themselves (incl. paused).
  const recurring = todos
    .filter((t) => t.type === "recurring")
    .sort((a, b) => nextRun(a) - nextRun(b));

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Active" value={todos.length} />
        <StatTile label="Overdue" value={overdueCount} tone="red" />
        <StatTile label="Recurring" value={recurring.length} tone="violet" />
      </div>

      {/* Todo (2/3) + Manage schedules (1/3) */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            icon={<ListTodo strokeWidth={1.8} className="h-4 w-4 text-blue-500" />}
            title="Todo"
            subtitle={
              overdueCount > 0
                ? `${overdueCount} overdue · then upcoming`
                : "Due now & upcoming, soonest first"
            }
            count={todoItems.length}
            accent={overdueCount > 0 ? "border-red-200" : undefined}
          >
            {todoItems.length === 0 ? (
              <EmptyHint>Nothing to do — you&apos;re all caught up</EmptyHint>
            ) : (
              <div className="space-y-1.5">
                {todoItems.map((todo) => (
                  <TodoRow
                    key={todo._id}
                    todo={todo}
                    justDone={justDone.has(todo._id)}
                    onDone={handleDone}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-1">
          <Panel
            icon={<Repeat strokeWidth={1.8} className="h-4 w-4 text-violet-500" />}
            title="Manage schedules"
            subtitle="Pause, edit, or remove repeating reminders"
            count={recurring.length}
          >
            {recurring.length === 0 ? (
              <EmptyHint>No repeating reminders yet</EmptyHint>
            ) : (
              <div className="space-y-1.5">
                {recurring.map((todo) => {
                  const summary = recurringSummary(todo);
                  return (
                    <div
                      key={todo._id}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-slate-50 ${
                        todo.enabled ? "" : "opacity-60"
                      }`}
                    >
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
                      <RowActions
                        todo={todo}
                        showToggle
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onEdit={onEdit}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
