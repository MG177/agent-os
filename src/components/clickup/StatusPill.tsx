/** A ClickUp status rendered with its native color as a soft pill. */
export function StatusPill({
  status,
  color,
  className = "",
}: {
  status: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
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
