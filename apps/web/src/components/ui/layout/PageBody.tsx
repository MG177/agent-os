import type { ReactNode } from "react";

export type PageBodyDirection = "col" | "row";

/**
 * Standard inset content area below `<PageHeader>`.
 * Applies `.app-page-body` rhythm (inset + section gap + bottom padding).
 * Set `inset={false}` on read/form pages where `<Page>` already owns width/padding.
 */
export function PageBody({
  children,
  className = "",
  fill = false,
  gap = true,
  inset = true,
  direction = "col",
}: {
  children: ReactNode;
  className?: string;
  /** Stretch to fill remaining column height (tasks, calendar grids). */
  fill?: boolean;
  /** Disable default section gap when content manages its own spacing. */
  gap?: boolean;
  /** Use `.app-screen-inset` width; false for read/form shells. */
  inset?: boolean;
  /** Flex main axis — `row` for sidebar + main (tasks). */
  direction?: PageBodyDirection;
}) {
  const gapClass = gap
    ? direction === "row"
      ? "gap-4 md:gap-5"
      : "gap-4 md:gap-6"
    : "gap-0 md:gap-0";

  return (
    <div
      className={[
        inset ? "app-page-body" : "pb-4 md:pb-8",
        "flex min-h-0",
        direction === "row" ? "flex-row" : "flex-col",
        gapClass,
        fill && "flex-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
