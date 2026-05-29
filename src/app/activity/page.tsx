"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ActivityRow } from "@/components/ui/ActivityRow";
import type { ActivityEvent, ActivityKind } from "@/lib/activity";

const FILTERS: { id: "all" | ActivityKind | "reverted"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "capture", label: "Capture" },
  { id: "nutrition", label: "Nutrition" },
  { id: "reverted", label: "Reverted" },
];

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [undoing, setUndoing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/activity");
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => e.kind === filter);

  async function handleUndo(event: ActivityEvent) {
    setUndoing(event.id);
    if ((event.kind === "capture" || event.kind === "whatsapp") && event.slug) {
      await fetch(`/api/inbox/${encodeURIComponent(event.slug)}`, {
        method: "DELETE",
      });
    } else if (event.kind === "nutrition" && event.mealId) {
      await fetch(`/api/nutrition/log/${encodeURIComponent(event.mealId)}`, {
        method: "DELETE",
      });
    }
    await load();
    setUndoing(null);
  }

  return (
    <div className="app-screen">
      <ScreenHeader title="Activity" />

      <section className="space-y-2">
        <p className="app-section-label">Filters</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`app-chip min-h-10 ${filter === id ? "app-chip-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="app-card flex-1">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No activity for this filter
          </p>
        ) : (
          filtered.map((event) => (
            <ActivityRow
              key={event.id}
              event={event}
              onUndo={
                event.undoable ? () => handleUndo(event) : undefined
              }
              undoing={undoing === event.id}
            />
          ))
        )}
      </div>

      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        Undo available for 24 hours after write
      </p>
    </div>
  );
}
