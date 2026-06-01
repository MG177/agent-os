"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClickUpTimeEntry } from "@/components/clickup/types";

/**
 * Tracks the workspace's single running time entry and exposes start/stop.
 * Shared by the Tasks header chip, the detail panel, and the Home widget.
 */
export function useClickUpTimer() {
  const [entry, setEntry] = useState<ClickUpTimeEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/clickup/time");
      if (!res.ok) {
        setEntry(null);
        return;
      }
      const data = await res.json();
      setEntry(data.entry ?? null);
    } catch {
      setEntry(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tick once a second only while a timer is running.
  useEffect(() => {
    if (!entry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [entry]);

  const start = useCallback(async (taskId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/clickup/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntry(data.entry ?? null);
        setNow(Date.now());
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/clickup/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (res.ok) setEntry(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return { entry, now, busy, start, stop, refresh };
}
