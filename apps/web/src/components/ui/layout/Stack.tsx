import type { ReactNode } from "react";

export type StackGap = "section" | "tight" | "none";

const GAP_CLASS: Record<StackGap, string> = {
  section: "app-stack",
  tight: "flex flex-col gap-2",
  none: "flex flex-col gap-0",
};

/** Vertical rhythm wrapper — section gap matches page body spacing. */
export function Stack({
  children,
  className = "",
  gap = "section",
}: {
  children: ReactNode;
  className?: string;
  gap?: StackGap;
}) {
  return (
    <div className={[GAP_CLASS[gap], className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
