import type { ReactNode } from "react";

/**
 * Sticky page title bar. Children render inside `.app-page-header-inset`
 * unless `inset={false}` (custom header chrome, e.g. nutrition toolbar).
 */
export function PageHeader({
  children,
  className = "",
  inset = true,
  insetClassName = "",
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  insetClassName?: string;
}) {
  return (
    <header className={`app-page-header ${className}`.trim()}>
      {inset ? (
        <div className={`app-page-header-inset ${insetClassName}`.trim()}>
          {children}
        </div>
      ) : (
        children
      )}
    </header>
  );
}
