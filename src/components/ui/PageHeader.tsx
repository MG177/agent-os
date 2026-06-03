import type { ReactNode } from "react";

/** Sticky page title bar. Content uses `.app-screen-inset`. */
export function PageHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={`app-page-header ${className}`.trim()}>
      {children}
    </header>
  );
}
