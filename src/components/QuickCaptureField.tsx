"use client";

import { useId, useState } from "react";

function IconSend({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function QuickCaptureField({
  onSaved,
  className = "",
  showLabel = true,
  size = "default",
}: {
  onSaved?: () => void;
  className?: string;
  showLabel?: boolean;
  size?: "default" | "tall";
}) {
  const fieldId = useId();
  const tall = size === "tall";
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const value = text.trim();
    if (!value || saving) return;

    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: value }),
    });

    if (res.ok) {
      setText("");
      setSaved(true);
      onSaved?.();
      window.dispatchEvent(new CustomEvent("inbox:updated"));
      setTimeout(() => setSaved(false), 2500);
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Failed to save");
    }

    setSaving(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSave();
    }
  }

  return (
    <section className={className} aria-label="Quick capture">
      {showLabel && (
        <p className="app-section-label mb-2">Quick capture</p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-shadow focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/20 md:rounded-3xl md:p-2.5">
        <div
          className={
            tall ? "flex min-w-0 flex-col gap-2" : "flex min-w-0 items-end gap-2"
          }
        >
          <label htmlFor={fieldId} className="sr-only">
            Quick capture
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What's on your mind?"
            rows={tall ? 5 : 2}
            className={`w-full min-w-0 resize-none rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              tall
                ? "min-h-[7.5rem] flex-1"
                : "min-h-[3.25rem] flex-1"
            }`}
          />
          <div className={tall ? "flex justify-end" : "shrink-0"}>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !text.trim()}
              aria-label={saving ? "Saving to Inbox" : "Save to Inbox"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
              ) : (
                <IconSend />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex min-h-[1.125rem] items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] text-slate-400">
          <kbd className="rounded bg-slate-100 px-1 font-sans">⌘</kbd>
          <span className="mx-0.5">+</span>
          <kbd className="rounded bg-slate-100 px-1 font-sans">Enter</kbd>
          <span className="ml-1 hidden sm:inline">to save</span>
        </p>
        {saved && !error && (
          <p className="text-[10px] font-medium text-emerald-600" role="status">
            Saved to Inbox
          </p>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
