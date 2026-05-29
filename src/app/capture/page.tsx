"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

const TAG_OPTIONS = ["idea", "task", "follow-up"];

interface RecentCapture {
  slug: string;
  title: string;
  mtime: number;
}

function formatTime(mtime: number): string {
  return new Date(mtime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CapturePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentCapture[]>([]);

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/inbox");
    const data = await res.json();
    setRecent((data.items ?? []).slice(0, 3));
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleSave() {
    setError("");
    if (!text.trim()) {
      setError("Write something to save");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), tags }),
    });
    if (res.ok) {
      const data = await res.json();
      const file = `Inbox/${data.item.filename}`;
      router.push(
        `/capture/success?file=${encodeURIComponent(file)}&slug=${encodeURIComponent(data.item.slug)}`,
      );
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="app-screen">
      <ScreenHeader title="Capture" backHref="/" />

      <section className="space-y-2">
        <p className="app-section-label">Tags (optional)</p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`app-chip min-h-10 ${tags.includes(tag) ? "app-chip-active" : ""}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-3">
        <label htmlFor="capture-text" className="sr-only">
          Note
        </label>
        <textarea
          id="capture-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          rows={8}
          autoFocus
          className="app-input min-h-[200px] flex-1 resize-none"
        />
        {error && (
          <p className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="app-btn-primary"
        >
          {saving ? "Saving…" : "Save to Inbox"}
        </button>
      </div>

      {recent.length > 0 && (
        <section className="space-y-2">
          <p className="app-section-label">Recent captures</p>
          {recent.map((item) => (
            <div key={item.slug} className="app-card">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">Saved</span>
                <span className="text-xs text-slate-400">
                  {formatTime(item.mtime)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                &ldquo;{item.title}&rdquo;
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
