"use client";

import { useCallback, useEffect, useState } from "react";
import LogPanel from "@/components/nutrition/panels/LogPanel";
import TodayPanel from "@/components/nutrition/panels/TodayPanel";
import type { LogEntry } from "@/components/nutrition/types";

/** Nutrition-page style logging (search food + portion) plus today's meals. */
export default function QuickMealPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/nutrition/log");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener("nutrition:updated", onUpdate);
    return () => window.removeEventListener("nutrition:updated", onUpdate);
  }, [load]);

  async function handleDelete(timestamp: string) {
    setDeleting(timestamp);
    const res = await fetch(
      `/api/nutrition/log/${encodeURIComponent(timestamp)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      window.dispatchEvent(new CustomEvent("nutrition:updated"));
    }
    setDeleting(null);
  }

  async function handleEdit(
    timestamp: string,
    quantityGrams: number,
  ): Promise<boolean> {
    const res = await fetch(
      `/api/nutrition/log/${encodeURIComponent(timestamp)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity_grams: quantityGrams }),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    setEntries(data.entries);
    window.dispatchEvent(new CustomEvent("nutrition:updated"));
    return true;
  }

  function handleLogged() {
    load();
    window.dispatchEvent(new CustomEvent("nutrition:updated"));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-1">
      <LogPanel onSuccess={handleLogged} />
      <TodayPanel
        entries={entries}
        deleting={deleting}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </div>
  );
}
