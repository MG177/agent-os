import type { ReactNode } from "react";

/**
 * Standard dashboard tile — `.app-card` with optional title row + action slot.
 */
export function Widget({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = title != null || action != null;

  return (
    <section
      className={["app-card flex min-h-0 flex-col", className]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeader && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {typeof title === "string" ? (
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          ) : (
            title
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
