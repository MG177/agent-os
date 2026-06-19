"use client";

/** Vault browse uses app sidebar on desktop; no extra browse/inbox panes. */
export default function ParaShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
