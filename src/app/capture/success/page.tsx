"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const file = params.get("file") ?? "Inbox/…";
  const slug = params.get("slug");

  return (
    <div className="app-screen flex flex-col items-center justify-center text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
        ✓
      </div>
      <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">Saved to Inbox</h1>

      <p className="mt-4 w-full break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-600">
        {file}
      </p>

      <p className="mt-3 text-xs text-slate-400">
        <Link href="/activity" className="font-semibold text-slate-600 underline">
          Undo within 24h
        </Link>{" "}
        from Activity
      </p>

      <div className="mt-6 flex w-full flex-col gap-2">
        <Link href="/capture" className="app-btn-primary">
          Capture another
        </Link>
        {slug && (
          <Link
            href={`/inbox/${encodeURIComponent(slug)}`}
            className="app-btn-secondary"
          >
            Open note
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CaptureSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="app-screen flex items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
