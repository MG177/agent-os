"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MousePointerClick, RefreshCw } from "lucide-react";
import { PRIORITY_OPTIONS } from "@/components/clickup/clickup-format";
import { QuickAddTask } from "@/components/clickup/QuickAddTask";
import { RunningTimerChip } from "@/components/clickup/RunningTimerChip";
import { TaskBoard } from "@/components/clickup/TaskBoard";
import { TaskDetailPanel } from "@/components/clickup/TaskDetailPanel";
import { TaskGroupList } from "@/components/clickup/TaskGroupList";
import { TaskSidebar } from "@/components/clickup/TaskSidebar";
import { useClickUpTimer } from "@/components/clickup/useClickUpTimer";
import type { ClickUpGroupedTasks } from "@/components/clickup/types";
import { PageHeader } from "@/components/ui/PageHeader";

type ConnState = "loading" | "not_configured" | "not_connected" | "ready";
type View = "list" | "board";
type Due = "all" | "overdue" | "today" | "week";

const DUE_LABELS: Record<Due, string> = {
  all: "All due dates",
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
};

/** Remembers the chosen workspace per-browser so reloads land on it. */
const LS_TEAM_KEY = "clickup.activeTeamId";

function readStoredTeam(): string | null {
  try {
    return localStorage.getItem(LS_TEAM_KEY);
  } catch {
    return null;
  }
}

function writeStoredTeam(teamId: string) {
  try {
    localStorage.setItem(LS_TEAM_KEY, teamId);
  } catch {
    /* ignore (private mode / disabled storage) */
  }
}

/** Tracks a min-width media query (client-only; false until mounted). */
function useMinWidth(px: number): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return match;
}

export default function TasksScreen() {
  const [conn, setConn] = useState<ConnState>("loading");
  const [teamName, setTeamName] = useState<string | undefined>();
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [workspaceResolved, setWorkspaceResolved] = useState(false);
  const [data, setData] = useState<ClickUpGroupedTasks | null>(null);
  const [view, setView] = useState<View>("list");
  const [due, setDue] = useState<Due>("all");
  const [priority, setPriority] = useState<string>("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const timer = useClickUpTimer();
  const isXl = useMinWidth(1280); // tailwind `xl` — persistent detail column

  const loadTasks = useCallback(
    async (refresh = false) => {
      const params = new URLSearchParams();
      params.set("due", due);
      if (priority) params.set("priority", priority);
      if (includeClosed) params.set("includeClosed", "1");
      if (refresh) params.set("refresh", "1");

      const res = await fetch(`/api/clickup/tasks?${params.toString()}`);
      if (res.status === 401) {
        setConn("not_connected");
        return;
      }
      if (res.status === 503) {
        setConn("not_configured");
        return;
      }
      if (res.ok) setData(await res.json());
    },
    [due, priority, includeClosed],
  );

  // Initial connection check.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/integrations/clickup/status");
      if (!res.ok) {
        if (!cancelled) setConn("not_configured");
        return;
      }
      const status = await res.json();
      if (cancelled) return;
      if (!status.configured) {
        setConn("not_configured");
        return;
      }
      if (!status.connected) {
        setConn("not_connected");
        return;
      }
      setTeamName(status.teamName);
      setConn("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load + reload tasks whenever filters change — but only after the active
  // workspace has been reconciled, so the first load hits the right team.
  useEffect(() => {
    if (conn === "ready" && workspaceResolved) loadTasks();
  }, [conn, workspaceResolved, loadTasks]);

  // Resolve the active workspace: list the token's workspaces, then align the
  // server to the browser-remembered choice (localStorage) before loading.
  useEffect(() => {
    if (conn !== "ready") return;
    let cancelled = false;
    (async () => {
      let teams: { id: string; name: string }[] = [];
      let serverActive: string | null = null;
      try {
        const res = await fetch("/api/integrations/clickup/workspaces");
        if (res.ok) {
          const d = await res.json();
          teams = d.teams ?? [];
          serverActive = d.activeTeamId ?? null;
        }
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      setWorkspaces(teams);

      const ids = teams.map((t) => t.id);
      const pref = readStoredTeam();

      if (pref && ids.includes(pref) && pref !== serverActive) {
        // Remembered workspace differs from the server's — switch to it.
        try {
          const sw = await fetch("/api/integrations/clickup/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId: pref }),
          });
          if (sw.ok) {
            const sd = await sw.json();
            if (cancelled) return;
            setActiveTeamId(sd.teamId);
            setTeamName(sd.teamName);
          } else if (!cancelled) {
            setActiveTeamId(serverActive);
          }
        } catch {
          if (!cancelled) setActiveTeamId(serverActive);
        }
      } else {
        setActiveTeamId(serverActive);
        if (!pref && serverActive) writeStoredTeam(serverActive);
      }
      if (!cancelled) setWorkspaceResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [conn]);

  async function switchWorkspace(teamId: string) {
    setSwitching(true);
    const res = await fetch("/api/integrations/clickup/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    if (res.ok) {
      const d = await res.json();
      writeStoredTeam(d.teamId);
      setActiveTeamId(d.teamId);
      setTeamName(d.teamName);
      setSelectedTaskId(null);
      setActiveListId(null);
      setData(null);
      await loadTasks(true);
    }
    setSwitching(false);
  }

  async function refresh() {
    setRefreshing(true);
    await loadTasks(true);
    await timer.refresh();
    setRefreshing(false);
  }

  async function handleComplete(taskId: string, listId: string) {
    setCompletingId(taskId);
    await fetch(`/api/clickup/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", listId }),
    });
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    await loadTasks(true);
    setCompletingId(null);
  }

  async function handleCreate(input: {
    name: string;
    listId: string;
    dueDate: number | null;
  }) {
    setCreating(true);
    await fetch("/api/clickup/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await loadTasks(true);
    setCreating(false);
  }

  const selectedTask = useMemo(
    () => data?.flat.find((t) => t.id === selectedTaskId) ?? null,
    [data, selectedTaskId],
  );

  // Per-list counts (current view) for the rail badges.
  const listCounts = useMemo(
    () => new Map((data?.groups ?? []).map((g) => [g.listId, g.count])),
    [data],
  );

  // Apply the rail's client-side list filter on top of the server-filtered set.
  const visibleGroups = useMemo(
    () =>
      activeListId
        ? (data?.groups ?? []).filter((g) => g.listId === activeListId)
        : (data?.groups ?? []),
    [data, activeListId],
  );
  const visibleFlat = useMemo(
    () =>
      activeListId
        ? (data?.flat ?? []).filter((t) => t.listId === activeListId)
        : (data?.flat ?? []),
    [data, activeListId],
  );

  // Drop the list filter if that list dropped out of the result (e.g. switched
  // workspace or a due filter that no longer contains it).
  useEffect(() => {
    if (
      activeListId &&
      data &&
      !data.lists.some((l) => l.listId === activeListId)
    ) {
      setActiveListId(null);
    }
  }, [data, activeListId]);

  // ── connection states ──────────────────────────────────────────────────
  if (conn === "loading") {
    return (
      <div className="app-screen app-screen-home">
        <p className="py-20 text-center text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (conn === "not_configured" || conn === "not_connected") {
    return (
      <div className="app-screen app-screen-home">
        <Header teamName={undefined} counts={null} controls={null} />
        <div className="app-card mx-auto mt-6 max-w-md text-center">
          <p className="text-sm font-semibold text-slate-800">
            {conn === "not_configured"
              ? "ClickUp is not configured"
              : "Connect ClickUp"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {conn === "not_configured"
              ? "Set TOKEN_ENCRYPTION_KEY in .env.local to enable the tasks surface."
              : "Paste your ClickUp Personal API token in Integrations to see and act on your tasks here."}
          </p>
          <Link
            href="/settings/integrations"
            className="mt-4 inline-block rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Open integrations
          </Link>
        </div>
      </div>
    );
  }

  // ── ready ──────────────────────────────────────────────────────────────
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <RunningTimerChip
        entry={timer.entry}
        now={timer.now}
        busy={timer.busy}
        onStop={timer.stop}
      />
      {/* Workspace + due view live in the rail on lg+; fall back to selects below. */}
      <div className="flex items-center gap-2 lg:hidden">
        {workspaces.length > 1 && (
          <select
            value={activeTeamId ?? ""}
            disabled={switching}
            onChange={(e) => switchWorkspace(e.target.value)}
            className="max-w-[12rem] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Workspace"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={due}
          onChange={(e) => setDue(e.target.value as Due)}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Due filter"
        >
          {(Object.keys(DUE_LABELS) as Due[]).map((key) => (
            <option key={key} value={key}>
              {DUE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
        {(["list", "board"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
          >
            {v}
          </button>
        ))}
      </div>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Priority filter"
      >
        <option value="">Any priority</option>
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setIncludeClosed((v) => !v)}
        className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${includeClosed
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
      >
        Done
      </button>
      <button
        type="button"
        onClick={refresh}
        aria-label="Refresh"
        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );

  const hasTasks = visibleFlat.length > 0;
  // At xl+ in list view the detail lives in a persistent inline column;
  // otherwise it slides in as an overlay. Gate the panel mount so it renders
  // in exactly one place (no duplicate comment/status fetches).
  const inlineDetail = isXl && view === "list";

  const detail = selectedTask && (
    <TaskDetailPanel
      task={selectedTask}
      trackingThis={timer.entry?.taskId === selectedTask.id}
      timerBusy={timer.busy}
      onStartTimer={timer.start}
      onStopTimer={timer.stop}
      onClose={() => setSelectedTaskId(null)}
      onChanged={() => loadTasks(true)}
    />
  );

  return (
    <div className="app-screen app-screen-home flex min-h-0 flex-1 flex-col">
      <PageHeader>
        <div className="app-screen-inset pb-4 pt-5 md:pb-5 md:pt-6">
          <Header teamName={teamName} counts={data?.counts ?? null} controls={controls} />
        </div>
      </PageHeader>

      <div className="app-screen-inset flex gap-4 pb-4 md:gap-5 md:pb-8">
        <TaskSidebar
          due={due}
          onDueChange={setDue}
          counts={data?.counts ?? null}
          lists={data?.lists ?? []}
          listCounts={listCounts}
          activeListId={activeListId}
          onSelectList={setActiveListId}
          workspaces={workspaces}
          activeTeamId={activeTeamId}
          switching={switching}
          onSwitchWorkspace={switchWorkspace}
        />

        {/* Center: quick add + list/board */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <QuickAddTask
            lists={data?.lists ?? []}
            creating={creating}
            onCreate={handleCreate}
          />
          <div className={view === "board" ? "min-h-96 overflow-hidden" : undefined}>
            {!data ? (
              <p className="py-16 text-center text-sm text-slate-400">Loading tasks…</p>
            ) : !hasTasks ? (
              <div className="app-card mt-2 text-center">
                <p className="text-sm font-semibold text-slate-700">No tasks</p>
                <p className="mt-1 text-xs text-slate-400">
                  Nothing assigned to you matches these filters.
                </p>
              </div>
            ) : view === "list" ? (
              <TaskGroupList
                groups={visibleGroups}
                selectedTaskId={selectedTaskId}
                completingId={completingId}
                onSelect={setSelectedTaskId}
                onComplete={handleComplete}
              />
            ) : (
              <div className="h-full min-h-[24rem]">
                <TaskBoard
                  tasks={visibleFlat}
                  selectedTaskId={selectedTaskId}
                  completingId={completingId}
                  onSelect={setSelectedTaskId}
                  onComplete={handleComplete}
                />
              </div>
            )}
          </div>
        </div>

        {/* Persistent detail slot (xl+, list view): panel or empty state. */}
        {view === "list" && (
          <div className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm xl:flex 2xl:w-96">
            {inlineDetail && detail ? (
              detail
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <MousePointerClick className="h-6 w-6 text-slate-300" strokeWidth={1.8} />
                <p className="text-sm font-medium text-slate-400">
                  Select a task to see details
                </p>
              </div>
            )}
          </div>
        )}

        {/* Overlay detail: mobile/tablet always; board view at all sizes. */}
        {selectedTask && !inlineDetail && (
          <>
            <button
              type="button"
              aria-label="Close details"
              onClick={() => setSelectedTaskId(null)}
              className="fixed inset-0 z-30 hidden bg-slate-900/20 sm:block"
            />
            <aside className="fixed inset-0 z-40 flex flex-col bg-white sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md sm:border-l sm:border-slate-100 sm:shadow-2xl">
              {detail}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

function Header({
  teamName,
  counts,
  controls,
}: {
  teamName: string | undefined;
  counts: { total: number; dueToday: number } | null;
  controls: React.ReactNode;
}) {
  const subtitle = counts
    ? `${teamName ? `${teamName} · ` : ""}${counts.total} assigned · ${counts.dueToday} due today`
    : "Your ClickUp tasks";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Tasks</h1>
        <p className="mt-0.5 text-xs text-slate-400 md:text-sm">{subtitle}</p>
      </div>
      {controls}
    </div>
  );
}
