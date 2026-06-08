"use client";

import { useEffect } from "react";
import useSWR, { type SWRConfiguration, mutate } from "swr";

const LS_PREFIX = "aos.cache.";
const MAX_ENTRY_BYTES = 50_000;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function lsRead<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { v: T; t: number };
    if (Date.now() - parsed.t > EXPIRY_MS) {
      localStorage.removeItem(LS_PREFIX + key);
      return undefined;
    }
    return parsed.v;
  } catch {
    return undefined;
  }
}

function lsRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // ignore
  }
}

function lsWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const s = JSON.stringify({ v: value, t: Date.now() });
    if (s.length > MAX_ENTRY_BYTES) {
      // Drop undersized stale snapshots so a future visit does not hydrate wrong data.
      lsRemove(key);
      return;
    }
    localStorage.setItem(LS_PREFIX + key, s);
  } catch {
    // quota exceeded — silent drop
  }
}

/** Read a namespaced localStorage snapshot (size/expiry-guarded). Exposed for
 *  components with a bespoke load flow that still want instant-paint hydration.
 *  Call only inside `useEffect` (or after mount) — never during SSR/render. */
export function readSnapshot<T>(key: string): T | undefined {
  return lsRead<T>(key);
}

/** Write a namespaced localStorage snapshot (size/expiry-guarded). */
export function writeSnapshot(key: string, value: unknown): void {
  lsWrite(key, value);
}

/** Drop a cached snapshot (e.g. after switching ClickUp workspace). */
export function clearResourceSnapshot(key: string): void {
  lsRemove(key);
}

export const defaultFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) {
      const err = Object.assign(new Error(r.statusText), { status: r.status });
      throw err;
    }
    return r.json();
  });

/**
 * SWR-backed resource hook with a localStorage snapshot for instant paint on
 * revisit. After mount, seeds SWR from the snapshot for instant paint, then
 * revalidates in the background and writes a fresh snapshot when it fits.
 *
 * Returns the standard SWR tuple: { data, error, isLoading, isValidating, mutate }.
 */
export function useResource<T>(
  key: string | null,
  fetcher?: ((key: string) => Promise<T>) | null,
  config?: SWRConfiguration<T>,
) {
  const swr = useSWR<T>(key, fetcher ?? defaultFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 4_000,
    ...config,
    onSuccess(data, swrKey, swrConfig) {
      if (key) lsWrite(key, data);
      config?.onSuccess?.(data, swrKey, swrConfig);
    },
  });

  // Never read localStorage during render — that diverges SSR from hydration.
  useEffect(() => {
    if (!key) return;
    const snapshot = lsRead<T>(key);
    if (snapshot === undefined) return;
    void mutate(
      key,
      (current: T | undefined) => current ?? snapshot,
      { revalidate: true },
    );
  }, [key]);

  return swr;
}

export { mutate };
