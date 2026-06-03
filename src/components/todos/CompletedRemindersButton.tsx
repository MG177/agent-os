"use client";

import { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { TodoCard } from "@/components/todos/TodoCard";
import { useTodos } from "@/components/todos/useTodos";
import type { TodoDoc } from "@/lib/todos";

interface Props {
  onEdit: (todo: TodoDoc) => void;
}

/**
 * Top-bar control for completed one-time reminders — same popover pattern as
 * Home RecentActivityButton.
 */
export function CompletedRemindersButton({ onEdit }: Props) {
  const [open, setOpen] = useState(false);
  const { todos, loading, markDone, toggle, remove } = useTodos("completed");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <History strokeWidth={1.8} className="h-4 w-4 text-slate-500" aria-hidden />
        <span className="hidden sm:inline">History</span>
        {!loading && todos.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold tabular-nums text-white">
            {todos.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close completed reminders"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Completed reminders"
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70 sm:w-[min(28rem,calc(100vw-2rem))]"
          >
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <p className="app-section-label">Completed</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <X strokeWidth={2} className="h-4 w-4" aria-hidden />
              </button>
            </header>

            {loading ? (
              <div className="flex flex-col gap-2 px-4 py-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : todos.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-400">
                No completed reminders yet
              </p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
                <div className="flex flex-col gap-2">
                  {todos.map((todo) => (
                    <TodoCard
                      key={todo._id}
                      todo={todo}
                      onDone={markDone}
                      onToggle={toggle}
                      onDelete={remove}
                      onEdit={(todo) => {
                        setOpen(false);
                        onEdit(todo);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
