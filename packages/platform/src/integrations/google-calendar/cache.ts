import type { CalendarEventSummary } from "@agent-os/contracts/integrations/google-calendar/types";

const TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  events: CalendarEventSummary[];
}

const cache = new Map<string, CacheEntry>();

export function getCachedEvents(key: string): CalendarEventSummary[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.events;
}

export function setCachedEvents(key: string, events: CalendarEventSummary[]) {
  cache.set(key, { expiresAt: Date.now() + TTL_MS, events });
}

export function clearEventsCache() {
  cache.clear();
}
