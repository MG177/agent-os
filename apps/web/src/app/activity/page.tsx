"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Page, Stack } from "@/components/ui/layout";
import { ActivityStats } from "@/components/activity/ActivityStats";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { computeStats, groupByDay } from "@/components/activity/activity-display";
import type { ActivityEvent, ActivityKind } from "@agent-os/platform/activity";

type FilterId = "all" | ActivityKind | "reverted";

const FILTERS: { id: FilterId; label: string; title: string }[] = [
  { id: "all", label: "All", title: "All activity" },
  { id: "capture", label: "Capture", title: "Captures" },
  { id: "nutrition", label: "Nutrition", title: "Nutrition" },
  { id: "reverted", label: "Reverted", title: "Reverted" },
];

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
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

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter)),
    [events, filter],
  );
  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const title = FILTERS.find((f) => f.id === filter)?.title ?? "Activity";

  const handleUndo = useCallback(
    async (event: ActivityEvent) => {
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
    },
    [load],
  );

  return (
    <Page variant="list">
      <ScreenHeader title="Activity" />

      <Stack gap="tight">
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
      </Stack>

      <div className="flex-1 lg:grid lg:grid-cols-[minmax(220px,260px)_1fr] lg:gap-6 lg:items-start">
        <ActivityStats title={title} stats={stats} />

        <div className="app-card mt-4 lg:mt-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">
              No activity for this filter
            </p>
          ) : (
            <ActivityTimeline
              groups={groups}
              onUndo={handleUndo}
              undoing={undoing}
            />
          )}
        </div>
      </div>

      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        Undo available for 24 hours after write
      </p>
    </Page>
  );
}
