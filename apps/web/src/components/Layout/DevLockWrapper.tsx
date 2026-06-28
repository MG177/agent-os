"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";

type DevLockWrapperProps = {
  nextPath: string;
  misconfigured?: boolean;
};

export default function DevLockWrapper({
  nextPath,
  misconfigured = false,
}: DevLockWrapperProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    misconfigured
      ? "Preview lock is misconfigured. Set DEV_PREVIEW_SECRET (16+ chars)."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (misconfigured) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/dev-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextPath }),
        credentials: "same-origin",
      });

      if (res.status === 401) {
        setError("Incorrect password.");
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Unable to unlock. Try again.");
        return;
      }

      const data = (await res.json()) as { next?: string };
      window.location.href = data.next ?? nextPath;
      return;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-8">
      <div className="app-card w-full max-w-sm space-y-5 p-6 md:p-7">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Agent OS</h1>
          <p className="text-sm text-slate-500">Enter the preview password to continue.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="dev-lock-password" className="text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              id="dev-lock-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              disabled={misconfigured || submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="app-btn-primary"
            disabled={misconfigured || submitting || !password.trim()}
          >
            {submitting ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
