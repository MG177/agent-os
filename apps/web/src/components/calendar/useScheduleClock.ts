"use client";

import { useEffect, useState } from "react";

const CLOCK_TICK_MS = 60_000;

/** Updates every minute so now / next / past states stay current. */
export function useScheduleClock(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return now;
}
