"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Circle, CircleCheckBig, Loader2, Play, Square } from "lucide-react";
import {
  DUE_TONE_CLASS,
  formatDue,
  formatElapsed,
} from "@/components/clickup/clickup-format";
import { useClickUpTimer } from "@/components/clickup/useClickUpTimer";
import type { ClickUpTask } from "@/components/clickup/types";

type State =
  | { kind: "loading" }
  | { kind: "hidden" } // not configured — stay out of the way
  | { kind: "not_connected" }
  | { kind: "ready"; tasks: ClickUpTask[] };

const MAX_ROWS = 6;

export function TodayTasksCard() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [completingId, setCompletingId] = useState<string | null>(null);
  const timer = useClickUpTimer();

  const load = useCallback(async () => {
    const res = await fetch("/api/clickup/tasks?due=all");
    if (res.status === 503) {
      setState({ kind: "hidden" });
      return;
    }
    if (res.status === 401) {
      setState({ kind: "not_connected" });
      return;
    }
    if (!res.ok) {
      setState({ kind: "hidden" });
      return;
    }
    const data = await res.json();
    const tasks = (data.flat as ClickUpTask[]).filter((t) => {
      const tone = formatDue(t.dueDate)?.tone;
      return tone === "overdue" || tone === "today";
    });
    setState({ kind: "ready", tasks });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function complete(task: ClickUpTask) {
    setCompletingId(task.id);
    await fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", listId: task.listId }),
    });
    await load();
    setCompletingId(null);
  }

  if (state.kind === "loading" || state.kind === "hidden") return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="app-section-label">Tasks due today</p>
        <Link
          href="/tasks"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          All tasks →
        </Link>
      </div>

      <div className="app-card flex max-h-[min(40vh,18rem)] min-h-[5.5rem] flex-col overflow-hidden p-0">
        {state.kind === "not_connected" ? (
          <Link
            href="/settings/integrations"
            className="flex flex-1 items-center justify-center px-4 py-6 text-center text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Connect ClickUp to see your tasks →
          </Link>
        ) : state.tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            Nothing due today 🎉
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
            {state.tasks.slice(0, MAX_ROWS).map((task) => {
              const due = formatDue(task.dueDate);
              const tracking = timer.entry?.taskId === task.id;
              return (
                <li
                  key={task.id}
                  className="group flex items-start gap-2 px-4 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => complete(task)}
                    disabled={completingId === task.id}
                    aria-label={`Complete ${task.name}`}
                    className="mt-0.5 shrink-0 text-slate-300 transition-colors hover:text-emerald-500 disabled:opacity-50"
                  >
                    {completingId === task.id ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <>
                        <Circle
                          className="h-[18px] w-[18px] group-hover:hidden"
                          strokeWidth={1.8}
                        />
                        <CircleCheckBig
                          className="hidden h-[18px] w-[18px] text-emerald-500 group-hover:block"
                          strokeWidth={1.8}
                        />
                      </>
                    )}
                  </button>
                  <Link
                    href="/tasks"
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-medium text-slate-800">
                      {task.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs">
                      <span className="truncate text-slate-400">
                        {task.listName}
                      </span>
                      {due && (
                        <span className={`font-medium ${DUE_TONE_CLASS[due.tone]}`}>
                          {due.label}
                        </span>
                      )}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => (tracking ? timer.stop() : timer.start(task.id))}
                    disabled={timer.busy}
                    aria-label={tracking ? "Stop timer" : "Start timer"}
                    className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold tabular-nums transition-colors disabled:opacity-50 ${
                      tracking
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                    }`}
                  >
                    {tracking ? (
                      <>
                        <Square className="h-3 w-3 fill-current" />
                        {formatElapsed(timer.entry!.start, timer.now)}
                      </>
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
