"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { DateTimePopover } from "@/components/todos/DateTimePopover";
import { dateInputToMs } from "@/components/clickup/clickup-format";
import type { ClickUpListOption } from "@/components/clickup/types";

export function QuickAddTask({
  lists,
  creating,
  onCreate,
}: {
  lists: ClickUpListOption[];
  creating: boolean;
  onCreate: (input: { name: string; listId: string; dueDate: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [listId, setListId] = useState("");
  const [due, setDue] = useState("");

  const effectiveListId = listId || lists[0]?.listId || "";
  const canAdd = name.trim().length > 0 && effectiveListId && !creating;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    onCreate({
      name: name.trim(),
      listId: effectiveListId,
      dueDate: dateInputToMs(due),
    });
    setName("");
    setDue("");
  }

  if (lists.length === 0) return null;

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a task…"
        className="min-w-[10rem] flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
      <select
        value={effectiveListId}
        onChange={(e) => setListId(e.target.value)}
        className="rounded-2xl bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Target list"
      >
        {lists.map((list) => (
          <option key={list.listId} value={list.listId}>
            {list.listName}
          </option>
        ))}
      </select>
      <DateTimePopover
        value={due ? `${due}T00:00` : ""}
        onChange={(v) => setDue(v ? v.slice(0, 10) : "")}
        mode="date"
        allowClear
        emptyLabel="Due date"
        summaryLabel="Due"
        className="justify-between text-xs font-medium"
      />
      <button
        type="submit"
        disabled={!canAdd}
        className="flex items-center gap-1.5 rounded-2xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {creating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
        )}
        Add
      </button>
    </form>
  );
}
