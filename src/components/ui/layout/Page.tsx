import type { ReactNode } from "react";

export type PageVariant = "dashboard" | "list" | "read" | "form";
export type PageScroll = "page" | "inner";

const VARIANT_CLASS: Record<PageVariant, string> = {
  dashboard: "app-screen app-screen-home",
  list: "app-screen app-screen-wide",
  read: "app-screen app-screen-read",
  form: "app-screen max-w-lg",
};

/** Default `fill` per variant — dashboard shells stretch; list/read/form scroll with main. */
const VARIANT_FILL: Record<PageVariant, boolean> = {
  dashboard: true,
  list: false,
  read: false,
  form: false,
};

/**
 * Top-level page shell. Picks width variant and optional inner-scroll lock.
 * Pair with `<PageHeader>` + `<PageBody>`.
 */
export function Page({
  children,
  variant = "dashboard",
  scroll = "page",
  fill,
  className = "",
}: {
  children: ReactNode;
  variant?: PageVariant;
  scroll?: PageScroll;
  fill?: boolean;
  className?: string;
}) {
  const shouldFill = fill ?? VARIANT_FILL[variant];
  const scrollClass = scroll === "inner" ? "md:overflow-hidden" : "";

  return (
    <div
      className={[
        VARIANT_CLASS[variant],
        // Mobile: no flex-1 and no shrink — otherwise the shell compresses below
        // its content and paints under the fixed bottom nav; main scroll handles clearance.
        shouldFill && "flex shrink-0 flex-col md:min-h-0 md:shrink md:flex-1",
        scrollClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
