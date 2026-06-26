"use client";

import Link from "next/link";

export function CalendarConnectionEmpty({
  variant = "page",
}: {
  variant?: "page" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-slate-600">Connect Google Calendar</p>
        <Link
          href="/settings/integrations"
          className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Open integrations →
        </Link>
      </div>
    );
  }

  return (
    <div className="app-card flex min-h-0 flex-1 flex-col justify-center p-8 text-center">
      <p className="text-sm font-medium text-slate-700">
        Google Calendar is not connected
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Connect your account to see your schedule here.
      </p>
      <Link
        href="/settings/integrations"
        className="mt-4 inline-block rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Connect in Settings
      </Link>
    </div>
  );
}

export function CalendarLoadingSkeleton({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div className="app-card flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-8 w-14 rounded-lg bg-slate-100" />
          <div className="h-8 w-8 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-slate-100" />
            <div className="h-2 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
