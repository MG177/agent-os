"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GoogleCalendarStatus } from "@/lib/integrations/google-calendar/types";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  invalid_state: "Invalid OAuth state. Try connecting again.",
  expired_state: "OAuth session expired. Try connecting again.",
};

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/integrations/google-calendar/status");
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setBanner({ type: "ok", text: "Google Calendar connected." });
      window.history.replaceState({}, "", "/settings/integrations");
    }
    const err = params.get("error");
    if (err) {
      setBanner({
        type: "err",
        text: ERROR_MESSAGES[err] ?? decodeURIComponent(err),
      });
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, [load]);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/integrations/google-calendar", { method: "DELETE" });
    await load();
    setDisconnecting(false);
    setBanner({ type: "ok", text: "Google Calendar disconnected." });
  }

  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;

  return (
    <div className="app-screen max-w-lg">
      <header className="space-y-1">
        <Link
          href="/"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Home
        </Link>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">Integrations</h1>
        <p className="text-xs text-slate-400">
          Connect external services to Agent OS
        </p>
      </header>

      {banner && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${banner.type === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
            }`}
        >
          {banner.text}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-section-label">
              Calendar
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              Google Calendar
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Read-only access to all calendars on your account (Home + Calendar
              week view).
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${connected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
              }`}
          >
            {connected ? "Connected" : "Off"}
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : !configured ? (
          <p className="mt-4 text-sm text-slate-500">
            Server OAuth is not configured. Set{" "}
            <code className="text-xs">GOOGLE_OAUTH_*</code> and encryption keys
            in <code className="text-xs">.env.local</code>.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {connected && status?.email && (
              <p className="text-xs text-slate-500">
                Account: <span className="font-medium">{status.email}</span>
              </p>
            )}
            {connected ? (
              <button
                type="button"
                onClick={disconnect}
                disabled={disconnecting}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/api/integrations/google-calendar/auth"
                className="block w-full rounded-2xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Connect Google Calendar
              </a>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        <Link href="/calendar" className="font-semibold text-blue-600 hover:text-blue-700">
          Open calendar view →
        </Link>
      </p>
    </div>
  );
}
