"use client";

import { useCallback, useEffect, useState } from "react";

/** localStorage key for the per-calendar visibility toggle (shared Home + Calendar). */
const HIDDEN_CALENDARS_KEY = "calendar:hiddenCalendarIds";

function readHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_CALENDARS_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) return new Set(ids as string[]);
    }
  } catch {
    // Ignore unavailable or malformed storage.
  }
  return new Set();
}

function writeHidden(ids: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_CALENDARS_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage quota/availability errors.
  }
}

/**
 * Hidden-calendar visibility persisted to localStorage, shared by the Calendar
 * page and Home's Today's Schedule so a toggle on one applies to both.
 *
 * Persistence is write-through on `toggleCalendar` only — never via a render
 * effect. A mount-time persist effect would capture the initial empty set and
 * clobber the saved value before the restore re-render lands, so read-only
 * consumers (Home) would wipe the setting just by mounting.
 */
export function useHiddenCalendars() {
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Restore once on mount, then keep in sync with other tabs.
  useEffect(() => {
    setHiddenCalendarIds(readHidden());

    const onStorage = (e: StorageEvent) => {
      if (e.key === HIDDEN_CALENDARS_KEY) setHiddenCalendarIds(readHidden());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleCalendar = useCallback((calendarId: string) => {
    setHiddenCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) next.delete(calendarId);
      else next.add(calendarId);
      writeHidden(next);
      return next;
    });
  }, []);

  return { hiddenCalendarIds, toggleCalendar } as const;
}
