"use client";

import { useState } from "react";
import { History, X } from "lucide-react";
import { TodoCard } from "@/components/todos/TodoCard";
import { useTodos } from "@/components/todos/useTodos";
import type { TodoDoc } from "@/lib/todos";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  onEdit: (todo: TodoDoc) => void;
}

export function CompletedRemindersButton({ onEdit }: Props) {
  const [open, setOpen] = useState(false);
  const { todos, loading, markDone, toggle, remove } = useTodos("completed");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <History strokeWidth={1.8} className="size-4 text-slate-500" aria-hidden />
        <span className="hidden sm:inline">History</span>
        {!loading && todos.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold tabular-nums text-white">
            {todos.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(28rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="app-section-label">Completed</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            className="size-7 rounded-lg text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X strokeWidth={2} className="size-4" aria-hidden />
          </Button>
        </header>

        {loading ? (
          <div className="flex flex-col gap-2 px-4 py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
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
                  onEdit={(t) => {
                    setOpen(false);
                    onEdit(t);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
