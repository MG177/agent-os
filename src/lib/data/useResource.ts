"use client";

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

function lsWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const s = JSON.stringify({ v: value, t: Date.now() });
    if (s.length > MAX_ENTRY_BYTES) return;
    localStorage.setItem(LS_PREFIX + key, s);
  } catch {
    // quota exceeded — silent drop
  }
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
 * revisit. First mount hydrates `data` synchronously from the snapshot (no
 * spinner); SWR revalidates in the background and writes a fresh snapshot on
 * success.
 *
 * Returns the standard SWR tuple: { data, error, isLoading, isValidating, mutate }.
 */
export function useResource<T>(
  key: string | null,
  fetcher?: ((key: string) => Promise<T>) | null,
  config?: SWRConfiguration<T>,
) {
  const snapshot = key ? lsRead<T>(key) : undefined;

  return useSWR<T>(key, fetcher ?? defaultFetcher, {
    fallbackData: snapshot,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 4_000,
    ...config,
    onSuccess(data, swrKey, swrConfig) {
      if (key) lsWrite(key, data);
      config?.onSuccess?.(data, swrKey, swrConfig);
    },
  });
}

export { mutate };
