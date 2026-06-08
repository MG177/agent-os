"use client";

import { useState } from "react";
import Link from "next/link";
import { Circle, CircleCheckBig, Loader2, Play, Square, Zap } from "lucide-react";
import { DUE_TONE_CLASS, formatDue } from "@/components/clickup/clickup-format";
import { ElapsedTime } from "@/components/clickup/ElapsedTime";
import { StatusPill } from "@/components/clickup/StatusPill";
import { useClickUpTimer } from "@/components/clickup/useClickUpTimer";
import { useResource, mutate } from "@/lib/data/useResource";
import { KEYS } from "@/lib/data/keys";
import { selectLatestSprint } from "@/lib/integrations/clickup/group";
import type { ClickUpGroupedTasks, ClickUpTask } from "@/components/clickup/types";

const MAX_ROWS = 6;

function TasksLoadingSkeleton() {
  return (
    <ul className="min-h-0 flex-1 divide-y divide-slate-50">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-2 px-4 py-2.5">
          <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TodayTasksCard() {
  const { data, error, isLoading } = useResource<ClickUpGroupedTasks>(
    KEYS.tasksDueAll,
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const timer = useClickUpTimer();

  // 503 = ClickUp not configured (Vercel without integration) — stay invisible.
  if (error?.status === 503) return null;

  const sprint = data ? selectLatestSprint(data) : null;
  const sprintList = sprint?.list ?? null;
  const tasks = sprint?.tasks ?? null;

  async function complete(task: ClickUpTask) {
    setCompletingId(task.id);
    await fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", listId: task.listId }),
    });
    await mutate(KEYS.tasksDueAll);
    setCompletingId(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-col space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="app-section-label">Latest sprint</p>
          {sprintList ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-violet-600">
              <Zap className="size-3 shrink-0" strokeWidth={1.8} aria-hidden />
              {sprintList.listName}
            </p>
          ) : data && !isLoading ? (
            <p className="mt-0.5 text-xs text-slate-400">No sprint lists found</p>
          ) : null}
        </div>
        <Link
          href="/tasks"
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          All tasks →
        </Link>
      </div>

      <div className="app-card flex max-h-[min(40vh,18rem)] min-h-[5.5rem] flex-1 flex-col overflow-hidden p-0 lg:max-h-none">
        {isLoading && !data ? (
          <TasksLoadingSkeleton />
        ) : error?.status === 401 ? (
          <Link
            href="/settings/integrations"
            className="flex flex-1 items-center justify-center px-4 py-6 text-center text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Connect ClickUp to see your tasks →
          </Link>
        ) : !sprintList ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            Add a sprint folder in ClickUp settings to track sprints here
          </p>
        ) : !tasks || tasks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-400">
            No open tasks in {sprintList.listName}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-y-auto">
            {tasks.slice(0, MAX_ROWS).map((task: ClickUpTask) => {
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
                  <Link href="/tasks" className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {task.name}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusPill
                        status={task.status.status}
                        color={task.status.color}
                      />
                      {due && (
                        <span
                          className={`text-xs font-medium ${DUE_TONE_CLASS[due.tone]}`}
                        >
                          {due.label}
                        </span>
                      )}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      tracking ? timer.stop() : timer.start(task.id)
                    }
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
                        <ElapsedTime start={timer.entry!.start} />
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
