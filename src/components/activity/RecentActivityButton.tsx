"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { ActivityRow } from "@/components/ui/ActivityRow";
import type { ActivityEvent } from "@/lib/activity";

/**
 * Top-bar button that opens a popover with the most recent activity.
 * Replaces the inline Home "Recent activity" column — keeps the glance
 * surface focused while activity stays one click away.
 */
export function RecentActivityButton({ events }: { events: ActivityEvent[] }) {
  const [open, setOpen] = useState(false);

  // Escape closes the popover.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <ClipboardList
          strokeWidth={1.8}
          className="h-4 w-4 text-slate-500"
          aria-hidden
        />
        <span className="hidden sm:inline">Recent activity</span>
        <span className="sm:hidden">Activity</span>
        {events.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold tabular-nums text-white">
            {events.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Outside-click backdrop */}
          <button
            type="button"
            aria-label="Close recent activity"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Recent activity"
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/70"
          >
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <p className="app-section-label">Recent activity</p>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/activity"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all →
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <X strokeWidth={2} className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {events.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-400">
                No activity yet — capture a note or log a meal
              </p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto px-4 py-1">
                {events.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
