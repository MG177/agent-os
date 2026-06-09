const COMPACT_STATUS_LABELS: Record<string, string> = {
  "in progress development": "DEV",
  "on hold": "HOLD",
};

function compactStatusLabel(status: string): string {
  return COMPACT_STATUS_LABELS[status.trim().toLowerCase()] ?? status;
}

/** A ClickUp status rendered with its native color as a soft pill. */
export function StatusPill({
  status,
  color,
  className = "",
  compact = false,
}: {
  status: string;
  color: string;
  className?: string;
  /** Short labels for dense list rows (e.g. IN PROGRESS DEVELOPMENT → DEV). */
  compact?: boolean;
}) {
  const label = compact ? compactStatusLabel(status) : status;

  return (
    <span
      title={compact && label !== status ? status : undefined}
      className={`inline-flex shrink-0 items-center rounded-full py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${compact ? "gap-1 px-1.5" : "gap-1.5 px-2"
        } ${className}`}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/** Just the color dot — used in dense status group headers. */
export function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
