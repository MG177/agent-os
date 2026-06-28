"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Loader2 } from "lucide-react";
import { QuickCaptureField } from "@/components/QuickCaptureField";

interface InboxItem {
  slug: string;
  filename: string;
  title: string;
  date?: string;
  mtime: number;
}

function formatDate(mtime: number): string {
  const diffDays = Math.floor((Date.now() - mtime) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(mtime).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export default function InboxQueue() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

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

  async function handleArchive(slug: string) {
    setArchiving(slug);
    const res = await fetch(`/api/inbox/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await load();
      window.dispatchEvent(new CustomEvent("inbox:updated"));
    }
    setArchiving(null);
  }

  const count = items.length;

  return (
    <section id="inbox" className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="app-section-label">Inbox · to triage</p>
        {!loading && count > 0 && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
            {count}
          </span>
        )}
      </div>

      <QuickCaptureField onSaved={load} showLabel={false} />

      <div className="app-card flex min-h-[16rem] flex-1 flex-col overflow-hidden p-0 lg:min-h-[32rem]">
        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            Loading…
          </p>
        ) : count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Inbox zero
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Captures land here, ready to file into a section.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.slug}
                className="group flex items-start gap-1.5 px-4 py-2.5 transition-colors hover:bg-slate-50"
              >
                <Link
                  href={`/inbox/${encodeURIComponent(item.slug)}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.date ?? formatDate(item.mtime)}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleArchive(item.slug)}
                  disabled={archiving === item.slug}
                  title="Archive"
                  aria-label={`Archive ${item.title}`}
                  className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100 disabled:opacity-40"
                >
                  {archiving === item.slug ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Archive strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
