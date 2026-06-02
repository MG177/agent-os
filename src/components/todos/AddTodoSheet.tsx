"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { TriggerRow } from "./TriggerRow";
import { DateTimePicker } from "./DateTimePicker";
import type { TriggerDoc } from "@/lib/trigger-format";
import type { TodoDoc } from "@/lib/todos";

function defaultDueAt(): string {
  // Tomorrow at 9:00 AM, local — a sensible reminder default.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultTrigger(): TriggerDoc {
  return {
    id: crypto.randomUUID(),
    type: "daily",
    dailyHour: 9,
    dailyMinute: 0,
    label: "",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: TodoDoc | null;
}

export function AddTodoSheet({ open, onClose, onSaved, editing }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<"once" | "recurring">("once");
  const [dueAt, setDueAt] = useState("");
  const [triggers, setTriggers] = useState<TriggerDoc[]>([defaultTrigger()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setNotes(editing.notes ?? "");
      setType(editing.type);
      if (editing.type === "once" && editing.dueAt) {
        const d = new Date(editing.dueAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setDueAt(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        );
      }
      if (editing.type === "recurring" && editing.triggers?.length) {
        setTriggers(editing.triggers);
      } else if (editing.type === "recurring") {
        setTriggers([defaultTrigger()]);
      }
    } else {
      setTitle("");
      setNotes("");
      setType("once");
      setDueAt(defaultDueAt());
      setTriggers([defaultTrigger()]);
    }
    setError("");
  }, [editing, open]);

  function updateTrigger(idx: number, updated: TriggerDoc) {
    setTriggers((prev) => prev.map((t, i) => (i === idx ? updated : t)));
  }

  function removeTrigger(idx: number) {
    setTriggers((prev) => prev.filter((_, i) => i !== idx));
  }

  function addTrigger() {
    setTriggers((prev) => [...prev, defaultTrigger()]);
  }

  function validateTrigger(t: TriggerDoc): string | null {
    if (t.type === "weekly" && (!t.weeklyDays || t.weeklyDays.length === 0)) {
      return "Select at least one day for the weekly trigger";
    }
    if (t.type === "cron" && !t.cronExpr?.trim()) {
      return "Enter a cron expression";
    }
    if (t.type === "interval") {
      if (!t.intervalValue || t.intervalValue < 1) {
        return "Enter how often the reminder repeats";
      }
      if (!t.startAt) {
        return "Pick a start date & time for the interval";
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (type === "once" && !dueAt) { setError("Pick a date and time"); return; }
    if (type === "recurring") {
      if (triggers.length === 0) { setError("Add at least one trigger"); return; }
      for (const t of triggers) {
        const err = validateTrigger(t);
        if (err) { setError(err); return; }
      }
    }

    setSaving(true);
    setError("");

    const body =
      type === "once"
        ? { title: title.trim(), notes: notes.trim() || undefined, type: "once" as const, dueAt: new Date(dueAt).toISOString() }
        : { title: title.trim(), notes: notes.trim() || undefined, type: "recurring" as const, triggers };

    try {
      if (editing) {
        const patch =
          type === "once"
            ? { action: "update" as const, title: title.trim(), notes: notes.trim() || undefined, dueAt: new Date(dueAt).toISOString() }
            : { action: "update" as const, title: title.trim(), notes: notes.trim() || undefined, triggers };
        const res = await fetch(`/api/todos/${editing._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {editing ? "Edit Reminder" : "New Reminder"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X strokeWidth={2} className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="todo-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Title + Type */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Title</label>
                <input
                  className="app-input w-full"
                  placeholder="Drink water, Take medicine…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Type</label>
                <div className="flex gap-1">
                  {(["once", "recurring"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                        type === t
                          ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t === "once" ? "Once" : "Recurring"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* One-time: date/time */}
            {type === "once" && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">When</label>
                <DateTimePicker value={dueAt} onChange={setDueAt} minDate={new Date()} />
              </div>
            )}

            {/* Recurring: triggers table */}
            {type === "recurring" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Triggers
                    <span className="ml-1 font-normal text-slate-400">— fires on whichever comes first</span>
                  </label>
                  <button
                    type="button"
                    onClick={addTrigger}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    <Plus strokeWidth={2.5} className="h-3 w-3" />
                    Add trigger
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="col-span-3">Type</div>
                    <div className="col-span-7">Schedule</div>
                    <div className="col-span-2 text-right">Next</div>
                  </div>
                  {triggers.map((t, idx) => (
                    <TriggerRow
                      key={t.id}
                      trigger={t}
                      onChange={(updated) => updateTrigger(idx, updated)}
                      onRemove={() => removeTrigger(idx)}
                      canRemove={triggers.length > 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                className="app-input w-full resize-none"
                rows={2}
                placeholder="Any extra details…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="todo-form"
              disabled={saving}
              className="app-btn-primary flex-1"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Reminder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
