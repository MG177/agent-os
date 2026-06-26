import type { ReactNode } from "react";

export type GridCols = 2 | 3 | 4 | "auto";

const COLS_CLASS: Record<GridCols, string> = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
  auto: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
};

/**
 * Responsive column grid — encodes the CLAUDE.md progressive-columns ladder.
 * Override breakpoints via `className` when a screen needs a custom ladder.
 */
export function Grid({
  children,
  cols = "auto",
  className = "",
}: {
  children: ReactNode;
  cols?: GridCols;
  className?: string;
}) {
  return (
    <div
      className={[
        "grid auto-rows-auto items-start gap-4 md:items-stretch md:gap-5",
        COLS_CLASS[cols],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
