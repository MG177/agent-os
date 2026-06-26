"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { ActivityRow } from "@/components/ui/ActivityRow";
import type { ActivityEvent } from "@agent-os/platform/activity";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function RecentActivityButton({ events }: { events: ActivityEvent[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        <ClipboardList
          strokeWidth={1.8}
          className="size-4 text-slate-500"
          aria-hidden
        />
        <span className="hidden sm:inline">Recent activity</span>
        <span className="sm:hidden">Activity</span>
        {events.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold tabular-nums text-white">
            {events.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              className="size-7 rounded-lg text-slate-400 hover:text-slate-700"
              aria-label="Close"
            >
              <X strokeWidth={2} className="size-4" aria-hidden />
            </Button>
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
      </PopoverContent>
    </Popover>
  );
}
