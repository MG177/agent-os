"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/layout";
import type { GoogleCalendarStatus } from "@/lib/integrations/google-calendar/types";
import type { ClickUpStatus } from "@/lib/integrations/clickup/types";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  invalid_state: "Invalid OAuth state. Try connecting again.",
  expired_state: "OAuth session expired. Try connecting again.",
};

const CONNECTED_MESSAGES: Record<string, string> = {
  "1": "Google Calendar connected.",
  clickup: "ClickUp connected.",
};

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [clickup, setClickup] = useState<ClickUpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [clickupDisconnecting, setClickupDisconnecting] = useState(false);
  const [clickupToken, setClickupToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [gcal, cu] = await Promise.all([
      fetch("/api/integrations/google-calendar/status"),
      fetch("/api/integrations/clickup/status"),
    ]);
    if (gcal.ok) setStatus(await gcal.json());
    if (cu.ok) setClickup(await cu.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      setBanner({
        type: "ok",
        text: CONNECTED_MESSAGES[connected] ?? "Connected.",
      });
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

  async function disconnectGoogle() {
    setDisconnecting(true);
    await fetch("/api/integrations/google-calendar", { method: "DELETE" });
    await load();
    setDisconnecting(false);
    setBanner({ type: "ok", text: "Google Calendar disconnected." });
  }

  async function disconnectClickUp() {
    setClickupDisconnecting(true);
    await fetch("/api/integrations/clickup", { method: "DELETE" });
    await load();
    setClickupDisconnecting(false);
    setBanner({ type: "ok", text: "ClickUp disconnected." });
  }

  async function saveClickUpToken() {
    const token = clickupToken.trim();
    if (!token) return;
    setSavingToken(true);
    const res = await fetch("/api/integrations/clickup/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setSavingToken(false);
    if (res.ok) {
      setClickupToken("");
      await load();
      setBanner({ type: "ok", text: "ClickUp connected." });
    } else {
      const data = await res.json().catch(() => ({}));
      setBanner({ type: "err", text: data.error ?? "Could not save token." });
    }
  }

  return (
    <Page variant="form">
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

      {/* Google Calendar */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-section-label">Calendar</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              Google Calendar
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Read-only access to all calendars on your account (Home + Calendar
              week view).
            </p>
          </div>
          <StatusBadge connected={status?.connected ?? false} />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : !status?.configured ? (
          <p className="mt-4 text-sm text-slate-500">
            Server OAuth is not configured. Set{" "}
            <code className="text-xs">GOOGLE_OAUTH_*</code> and encryption keys
            in <code className="text-xs">.env.local</code>.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {status.connected && status.email && (
              <p className="text-xs text-slate-500">
                Account: <span className="font-medium">{status.email}</span>
              </p>
            )}
            {status.connected ? (
              <button
                type="button"
                onClick={disconnectGoogle}
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

      {/* ClickUp */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-section-label">Tasks</p>
            <p className="mt-1 text-sm font-bold text-slate-900">ClickUp</p>
            <p className="mt-1 text-xs text-slate-500">
              Two-way access to tasks assigned to you — view, complete, create,
              comment, and track time.
            </p>
          </div>
          <StatusBadge connected={clickup?.connected ?? false} />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : !clickup?.configured ? (
          <p className="mt-4 text-sm text-slate-500">
            Encryption key missing. Set{" "}
            <code className="text-xs">TOKEN_ENCRYPTION_KEY</code> in{" "}
            <code className="text-xs">.env.local</code> to store the token
            securely.
          </p>
        ) : clickup.connected ? (
          <div className="mt-4 space-y-3">
            {(clickup.teamName || clickup.username) && (
              <p className="text-xs text-slate-500">
                Workspace:{" "}
                <span className="font-medium">
                  {clickup.teamName ?? clickup.username}
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={disconnectClickUp}
              disabled={clickupDisconnecting}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {clickupDisconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="clickup-token"
                className="text-xs font-medium text-slate-600"
              >
                Personal API token
              </label>
              <input
                id="clickup-token"
                type="password"
                autoComplete="off"
                value={clickupToken}
                onChange={(e) => setClickupToken(e.target.value)}
                placeholder="pk_••••••••••••"
                className="w-full rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                ClickUp → Settings → Apps → API Token (no admin needed).
              </p>
            </div>
            <button
              type="button"
              onClick={saveClickUpToken}
              disabled={savingToken || !clickupToken.trim()}
              className="block w-full rounded-2xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {savingToken ? "Connecting…" : "Connect ClickUp"}
            </button>

            {clickup.oauthConfigured && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    or
                  </span>
                  <span className="h-px flex-1 bg-slate-100" />
                </div>
                <a
                  href="/api/integrations/clickup/auth"
                  className="block w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Connect with OAuth
                </a>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 text-center text-xs text-slate-400">
        <Link href="/calendar" className="font-semibold text-blue-600 hover:text-blue-700">
          Open calendar →
        </Link>
        <Link href="/tasks" className="font-semibold text-blue-600 hover:text-blue-700">
          Open tasks →
        </Link>
      </div>
    </Page>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${connected
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500"
        }`}
    >
      {connected ? "Connected" : "Off"}
    </span>
  );
}
