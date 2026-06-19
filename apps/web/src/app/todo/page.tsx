"use client";

import { useState } from "react";
import { Plus, BellRing } from "lucide-react";
import { useTodos } from "@/components/todos/useTodos";
import { TodoCommandCenter } from "@/components/todos/TodoCommandCenter";
import { AddTodoSheet } from "@/components/todos/AddTodoSheet";
import { CompletedRemindersButton } from "@/components/todos/CompletedRemindersButton";
import type { TodoDoc } from "@/lib/todos";
import { PageHeader } from "@/components/ui/PageHeader";
import { Page, PageBody } from "@/components/ui/layout";

export default function TodoPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDoc | null>(null);

  const { todos, loading, refresh, markDone, toggle, remove } = useTodos("active");

  function handleEdit(todo: TodoDoc) {
    setEditing(todo);
    setSheetOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setSheetOpen(true);
  }

  return (
    <Page variant="dashboard">
      <PageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50">
              <BellRing strokeWidth={1.8} className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reminders</h1>
              <p className="text-xs text-slate-500">One-time &amp; recurring todos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CompletedRemindersButton onEdit={handleEdit} />
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              <Plus strokeWidth={2.5} className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </PageHeader>

      <PageBody gap={false}>
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100">
                <BellRing strokeWidth={1.5} className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No reminders yet</p>
              <p className="max-w-xs text-xs text-slate-400">
                Add one-time or recurring reminders to keep track of habits and tasks.
              </p>
              <button
                type="button"
                onClick={handleAdd}
                className="mt-1 flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus strokeWidth={2.5} className="h-4 w-4" />
                Add Reminder
              </button>
            </div>
          ) : (
            <TodoCommandCenter
              todos={todos}
              onDone={markDone}
              onToggle={toggle}
              onDelete={remove}
              onEdit={handleEdit}
            />
          )}
        </div>
      </PageBody>

      <AddTodoSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditing(null); }}
        onSaved={refresh}
        editing={editing}
      />
    </Page>
  );
}
