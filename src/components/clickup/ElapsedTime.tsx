"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/components/clickup/clickup-format";

/**
 * Self-contained elapsed-time display. Owns its own 1s tick so that the
 * running timer no longer forces its parent (the tasks list, the Home card)
 * to re-render every second — only this leaf updates.
 */
export function ElapsedTime({
  start,
  className,
}: {
  start: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className={className}>{formatElapsed(start, now)}</span>;
}
