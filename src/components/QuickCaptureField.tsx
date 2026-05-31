"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Hash, Send, X } from "lucide-react";

const TAG_SUGGESTIONS = ["idea", "task", "follow-up"];

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function QuickCaptureField({
  onSaved,
  className = "",
  showLabel = true,
  showTags = false,
  size = "default",
}: {
  onSaved?: () => void;
  className?: string;
  showLabel?: boolean;
  showTags?: boolean;
  size?: "default" | "tall";
}) {
  const fieldId = useId();
  const tall = size === "tall";
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Grow the compact field with its content, up to a cap, then scroll.
  // (The `tall` variant already flex-fills its container, so leave it.)
  const autoSize = useCallback(() => {
    const el = taRef.current;
    if (!el || tall) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [tall]);

  useEffect(() => {
    autoSize();
  }, [text, autoSize]);

  const addTag = useCallback((raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagInput("");
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  async function handleSave() {
    const value = text.trim();
    if (!value || saving) return;

    // Fold any half-typed tag into the payload too.
    const pending = normalizeTag(tagInput);
    const allTags =
      showTags && pending && !tags.includes(pending) ? [...tags, pending] : tags;

    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: value,
        ...(showTags && allTags.length ? { tags: allTags } : {}),
      }),
    });

    if (res.ok) {
      setText("");
      setTags([]);
      setTagInput("");
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

  const suggestions = TAG_SUGGESTIONS.filter((s) => !tags.includes(s));

  return (
    <section className={className} aria-label="Quick capture">
      {showLabel && <p className="app-section-label mb-2">Quick capture</p>}
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
            ref={taRef}
            id={fieldId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="What's on your mind?"
            rows={tall ? 5 : 2}
            className={`w-full min-w-0 flex-1 resize-none overflow-y-auto rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
              tall ? "min-h-[7.5rem]" : "min-h-[3.25rem]"
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
                <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      {showTags && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-700"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
                >
                  <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                </button>
              </span>
            ))}
            <div className="inline-flex min-w-[6rem] flex-1 items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
              <Hash
                className="h-3 w-3 shrink-0 text-slate-400"
                strokeWidth={2}
                aria-hidden
              />
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder={tags.length ? "Add tag" : "Add tags"}
                aria-label="Add tag"
                className="w-full min-w-0 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
