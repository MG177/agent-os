"use client";

import { useCallback, useState } from "react";
import { useResource, mutate } from "@/lib/data/useResource";
import { KEYS } from "@/lib/data/keys";
import type { ClickUpTimeEntry } from "@/components/clickup/types";

type TimeResponse = { entry: ClickUpTimeEntry | null };

/**
 * Tracks the workspace's single running time entry and exposes start/stop.
 * Shared by the Tasks header chip, the detail modal, and the Home widget.
 *
 * The 1s elapsed tick lives in `<ElapsedTime>`, not here — so consumers of
 * this hook only re-render when the entry itself changes (start/stop), not
 * every second while a timer runs.
 */
export function useClickUpTimer() {
  const { data } = useResource<TimeResponse>(KEYS.clickupTime, undefined, {
    // The endpoint may 401/503 when ClickUp isn't connected — treat as "no timer".
    shouldRetryOnError: false,
    onError: () => {},
  });
  const entry = data?.entry ?? null;
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => mutate(KEYS.clickupTime), []);

  const start = useCallback(async (taskId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/clickup/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      });
      if (res.ok) {
        const d = await res.json();
        await mutate(KEYS.clickupTime, { entry: d.entry ?? null }, false);
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
      if (res.ok) await mutate(KEYS.clickupTime, { entry: null }, false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { entry, busy, start, stop, refresh };
}
