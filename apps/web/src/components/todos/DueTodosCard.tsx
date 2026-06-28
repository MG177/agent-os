"use client";

import Link from "next/link";
import { Check, BellRing, ArrowRight } from "lucide-react";
import { useDueTodos } from "./useTodos";

function TimeChip({ nextRunAt }: { nextRunAt: Date }) {
  const ms = nextRunAt.getTime() - Date.now();
  const overdue = ms < 0;
  const mins = Math.round(Math.abs(ms) / 60000);
  const label =
    overdue
      ? mins < 60
        ? `${mins}m ago`
        : `${Math.round(mins / 60)}h ago`
      : mins < 60
        ? `in ${mins}m`
        : `in ${Math.round(mins / 60)}h`;

  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${overdue
          ? "bg-red-50 text-red-600"
          : mins < 120
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-500"
        }`}
    >
      {label}
    </span>
  );
}

export function DueTodosCard() {
  const { todos, loading, markDone } = useDueTodos();

  return (
    <div className="app-card flex h-full min-h-[5.5rem] flex-col gap-3 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing strokeWidth={1.8} className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-slate-900">Reminders</span>
          {todos.length > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {todos.length}
            </span>
          )}
        </div>
        <Link
          href="/todo"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary"
        >
          View all
          <ArrowRight strokeWidth={2} className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-2 text-center text-xs text-slate-500">
          Nothing due, you&apos;re on track
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {todos.slice(0, 5).map((todo) => (
            <li
              key={todo._id}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => markDone(todo._id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                title="Mark done"
              >
                <Check strokeWidth={2.5} className="h-2.5 w-2.5" />
              </button>
              <span className="flex-1 truncate text-xs font-medium text-slate-800">
                {todo.title}
              </span>
              {todo.nextRunAt && (
                <TimeChip nextRunAt={new Date(todo.nextRunAt)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
