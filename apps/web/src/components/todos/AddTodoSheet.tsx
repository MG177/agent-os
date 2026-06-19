"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { TriggerRow } from "./TriggerRow";
import { DateTimePicker } from "./DateTimePicker";
import type { TriggerDoc } from "@/lib/trigger-format";
import type { TodoDoc } from "@/lib/todos";
import {
  AppModal,
  AppModalBody,
  AppModalFooter,
  AppModalHeader,
} from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function defaultDueAt(): string {
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

  return (
    <AppModal open={open} onOpenChange={(v) => !v && onClose()}>
      <AppModalHeader
        title={editing ? "Edit Reminder" : "New Reminder"}
        onClose={onClose}
      />

      <AppModalBody>
        <form id="todo-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="mb-1 block text-xs font-semibold text-slate-700">
                Title
              </Label>
              <Input
                placeholder="Drink water, Take medicine…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-slate-700">
                Type
              </Label>
              <ToggleGroup
                value={[type]}
                onValueChange={(v) => {
                  const next = v[0] as "once" | "recurring" | undefined;
                  if (next) setType(next);
                }}
                spacing={0}
                className="w-full"
              >
                {(["once", "recurring"] as const).map((t) => (
                  <ToggleGroupItem
                    key={t}
                    value={t}
                    className="flex-1 rounded-lg border py-2.5 text-xs data-[state=on]:border-blue-600 data-[state=on]:bg-blue-50 data-[state=on]:font-semibold data-[state=on]:text-blue-700"
                  >
                    {t === "once" ? "Once" : "Recurring"}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {type === "once" && (
            <div>
              <Label className="mb-2 block text-xs font-semibold text-slate-700">
                When
              </Label>
              <DateTimePicker value={dueAt} onChange={setDueAt} minDate={new Date()} />
            </div>
          )}

          {type === "recurring" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Triggers
                  <span className="ml-1 font-normal text-slate-400">— fires on whichever comes first</span>
                </Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addTrigger}
                  className="h-auto gap-1 p-0 text-xs font-semibold"
                >
                  <Plus strokeWidth={2.5} className="size-3" />
                  Add trigger
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
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

          <div>
            <Label className="mb-1 block text-xs font-semibold text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              placeholder="Any extra details…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </form>
      </AppModalBody>

      <AppModalFooter>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="todo-form" disabled={saving} className="flex-1">
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Reminder"}
          </Button>
        </div>
      </AppModalFooter>
    </AppModal>
  );
}
