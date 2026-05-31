"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QuickCaptureField } from "@/components/QuickCaptureField";
import { useQuickPanel } from "@/components/QuickPanelContext";

interface InboxItem {
  slug: string;
  filename: string;
  title: string;
  date?: string;
  mtime: number;
}

function formatDate(mtime: number): string {
  const d = new Date(mtime);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { open } = useQuickPanel();

  const load = useCallback(async () => {
    const res = await fetch("/api/inbox");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onInboxUpdate() {
      void load();
    }
    window.addEventListener("inbox:updated", onInboxUpdate);
    return () => window.removeEventListener("inbox:updated", onInboxUpdate);
  }, [load]);

  const count = items.length;

  return (
    <div className="app-screen app-screen-wide">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 md:pb-5">
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
          Inbox
        </h1>
        {!loading && count > 0 && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-blue-600">
            {count}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start md:gap-5 lg:gap-6">
        {/* Item list — left on desktop */}
        <section className="order-2 flex min-h-0 flex-col space-y-2 md:order-1 md:col-span-7 md:min-h-[28rem] lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="app-section-label">To triage</p>
            <button
              type="button"
              onClick={() => open("capture")}
              className="hidden h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 md:inline-flex"
            >
              New capture
            </button>
          </div>

          <div className="app-card flex min-h-[12rem] flex-1 flex-col overflow-hidden p-0 md:min-h-0">
            {loading ? (
              <p className="px-4 py-12 text-center text-sm text-slate-400">
                Loading…
              </p>
            ) : count === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center md:py-16">
                <p className="text-sm font-semibold text-slate-700">
                  Inbox is empty
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Use Capture or quick capture below
                </p>
                <button
                  type="button"
                  onClick={() => open("capture")}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 md:hidden"
                >
                  New capture
                </button>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/inbox/${encodeURIComponent(item.slug)}`}
                      className="block px-4 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-medium text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.date ?? formatDate(item.mtime)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Summary + capture — right on desktop */}
        <aside className="order-1 space-y-4 md:order-2 md:col-span-5 lg:col-span-4">
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 p-5 text-white shadow-lg shadow-blue-200 md:p-6">
            <p className="app-section-label-invert">
              Waiting
            </p>
            <p className="text-3xl font-bold tabular-nums md:text-4xl">
              {loading ? "—" : count}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {loading
                ? "Loading inbox…"
                : count === 0
                  ? "Inbox zero — nice work"
                  : `${count} item${count === 1 ? "" : "s"} to triage`}
            </p>
          </div>

          <QuickCaptureField onSaved={load} size="tall" />
        </aside>
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => open("capture")}
          className="app-btn-secondary flex w-full justify-center"
        >
          New capture
        </button>
      </div>
    </div>
  );
}
