import { Flag } from "lucide-react";
import { priorityLevel } from "@/components/clickup/clickup-format";

/** Small priority flag using the task's native priority color. */
export function PriorityFlag({
  priority,
  className = "h-3.5 w-3.5",
}: {
  priority: { priority: string; color: string } | null;
  className?: string;
}) {
  if (!priority) return null;
  const level = priorityLevel(priority.priority);
  // Only surface the flag for Urgent/High; Normal/Low stay quiet to reduce noise.
  if (level == null || level > 2) return null;
  return (
    <Flag
      strokeWidth={1.8}
      className={`shrink-0 ${className}`}
      style={{ color: priority.color, fill: priority.color }}
      aria-label={`${priority.priority} priority`}
    />
  );
}
