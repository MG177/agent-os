"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTodos } from "@/components/todos/useTodos";
import { TodoCard } from "@/components/todos/TodoCard";
import { TodoCommandCenter } from "@/components/todos/TodoCommandCenter";
import { AddTodoSheet } from "@/components/todos/AddTodoSheet";
import type { TodoDoc } from "@/lib/todos";
import { BellRing } from "lucide-react";

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function TodoPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TodoDoc | null>(null);

  const { todos, loading, refresh, markDone, toggle, remove } = useTodos(tab);

  function handleEdit(todo: TodoDoc) {
    setEditing(todo);
    setSheetOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setSheetOpen(true);
  }

  return (
    <div className="app-screen app-screen-home">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 md:pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50">
            <BellRing strokeWidth={1.8} className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Reminders</h1>
            <p className="text-xs text-slate-500">One-time &amp; recurring todos</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          <Plus strokeWidth={2.5} className="h-4 w-4" />
          Add
        </button>
      </header>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-1.5 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
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
            {tab === "active" ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">No completed reminders</p>
                <p className="text-xs text-slate-400">Completed one-time todos will appear here.</p>
              </>
            )}
          </div>
        ) : tab === "active" ? (
          <TodoCommandCenter
            todos={todos}
            onDone={markDone}
            onToggle={toggle}
            onDelete={remove}
            onEdit={handleEdit}
          />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {todos.map((todo) => (
              <TodoCard
                key={todo._id}
                todo={todo}
                onDone={markDone}
                onToggle={toggle}
                onDelete={remove}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      <AddTodoSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditing(null); }}
        onSaved={refresh}
        editing={editing}
      />
    </div>
  );
}
