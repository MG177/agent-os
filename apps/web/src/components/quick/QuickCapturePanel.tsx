"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Inbox as InboxIcon, Loader2 } from "lucide-react";
import { QuickCaptureField } from "@/components/QuickCaptureField";

interface InboxItem {
  slug: string;
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

/** Quick capture field + the current Inbox list. */
export default function QuickCapturePanel() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // QuickCaptureField (and archive) dispatch `inbox:updated` — keep in sync.
  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener("inbox:updated", onUpdate);
    return () => window.removeEventListener("inbox:updated", onUpdate);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <QuickCaptureField showLabel={false} showTags className="shrink-0" />

      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <p className="app-section-label">Inbox</p>
        {items.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-blue-600">
            {items.length}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-1 py-6 text-center text-xs text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <InboxIcon
              strokeWidth={1.8}
              className="mb-2 h-7 w-7 text-slate-300"
              aria-hidden
            />
            <p className="text-xs text-slate-400">Inbox zero</p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {items.map((item, idx) => (
              <li
                key={item.slug}
                className={`group flex items-start gap-1.5 px-3 py-2.5 transition-colors hover:bg-slate-50 ${idx < items.length - 1 ? "border-b border-slate-50" : ""
                  }`}
              >
                <Link
                  href={`/inbox/${encodeURIComponent(item.slug)}`}
                  className="min-w-0 flex-1"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-700 transition-colors group-hover:text-slate-900">
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
    </div>
  );
}
