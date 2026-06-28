"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { PRIORITY_OPTIONS } from "@/components/clickup/clickup-format";
import { QuickAddTask } from "@/components/clickup/QuickAddTask";
import { RunningTimerChip } from "@/components/clickup/RunningTimerChip";
import { TaskBoard } from "@/components/clickup/TaskBoard";
import { TaskDetailModal } from "@/components/clickup/TaskDetailModal";
import { TaskGroupList } from "@/components/clickup/TaskGroupList";
import { TaskSidebar } from "@/components/clickup/TaskSidebar";
import { useClickUpTimer } from "@/components/clickup/useClickUpTimer";
import type { ClickUpGroupedTasks } from "@/components/clickup/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Page, PageBody } from "@/components/ui/layout";
import { KEYS } from "@agent-os/contracts/data/keys";
import {
  clearResourceSnapshot,
  readSnapshot,
  writeSnapshot,
} from "@/lib/data/useResource";

/** Snapshot of the last-rendered grouped tasks — hydrated on mount for an
 *  instant paint on revisit, then refreshed by the normal load. */
const TASKS_SNAPSHOT_KEY = "clickup.tasks.view";

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

  useEffect(() => {
    const snapshot = readSnapshot<ClickUpGroupedTasks>(TASKS_SNAPSHOT_KEY);
    if (snapshot) setData(snapshot);
  }, []);

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
      if (res.ok) {
        const json = (await res.json()) as ClickUpGroupedTasks;
        setData(json);
        writeSnapshot(TASKS_SNAPSHOT_KEY, json);
      }
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
      clearResourceSnapshot(KEYS.tasksDueAll);
      clearResourceSnapshot(KEYS.sprintLatest);
      clearResourceSnapshot(TASKS_SNAPSHOT_KEY);
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

  const handleComplete = useCallback(
    async (taskId: string, listId: string) => {
      setCompletingId(taskId);
      await fetch(`/api/clickup/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", listId }),
      });
      setSelectedTaskId((cur) => (cur === taskId ? null : cur));
      await loadTasks(true);
      setCompletingId(null);
    },
    [loadTasks],
  );

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
    () => (selectedTaskId ? (data?.flat.find((t) => t.id === selectedTaskId) ?? null) : null),
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
  // Cold start (no snapshot): show a skeleton, never a blank screen. If we have
  // a snapshot, fall through and paint it optimistically while conn resolves.
  if (conn === "loading" && !data) {
    return (
      <Page variant="dashboard">
        <PageHeader>
          <Header teamName={undefined} counts={null} controls={null} />
        </PageHeader>
        <PageBody fill>
          <TaskListSkeleton />
        </PageBody>
      </Page>
    );
  }

  if (conn === "not_configured" || conn === "not_connected") {
    return (
      <Page variant="dashboard" fill={false}>
        <PageHeader>
          <Header teamName={undefined} counts={null} controls={null} />
        </PageHeader>
        <PageBody gap={false}>
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
              className="mt-4 inline-block rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
            >
              Open integrations
            </Link>
          </div>
        </PageBody>
      </Page>
    );
  }

  // ── ready ──────────────────────────────────────────────────────────────
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <RunningTimerChip
        entry={timer.entry}
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
            className="max-w-[12rem] rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
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
          className="rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Due filter"
        >
          {(Object.keys(DUE_LABELS) as Due[]).map((key) => (
            <option key={key} value={key}>
              {DUE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex rounded-2xl bg-slate-100 p-0.5 text-xs font-semibold">
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
        className="rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring"
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
        className={`rounded-2xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${includeClosed
          ? "border-primary/30 bg-accent text-primary"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
      >
        Done
      </button>
      <button
        type="button"
        onClick={refresh}
        aria-label="Refresh"
        className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );

  const hasTasks = visibleFlat.length > 0;

  return (
    <Page variant="dashboard">
      <PageHeader>
        <Header teamName={teamName} counts={data?.counts ?? null} controls={controls} />
      </PageHeader>

      <PageBody fill direction="row">
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
          <div
            className={`flex min-h-0 flex-1 flex-col ${view === "board" ? "overflow-hidden" : ""}`}
          >
            {!data ? (
              <TaskListSkeleton />
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

      </PageBody>

      {/* Task detail modal — all screen sizes and view modes. */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          trackingThis={timer.entry?.taskId === selectedTask.id}
          timerBusy={timer.busy}
          onStartTimer={timer.start}
          onStopTimer={timer.stop}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => loadTasks(true)}
        />
      )}
    </Page>
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

/** Skeleton list shown on cold start (no cached snapshot) instead of a blank
 *  "Loading…" — holds the list footprint so there's no layout shift. */
function TaskListSkeleton() {
  return (
    <div className="app-card min-h-0 flex-1 overflow-hidden p-0">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-3">
            <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-2 w-1/3 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
