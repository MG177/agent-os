"use client";

import { useCallback, useEffect, useState } from "react";
import ProgressRing from "@/components/ProgressRing";
import { RecentActivityButton } from "@/components/activity/RecentActivityButton";
import { StatCard } from "@/components/ui/StatCard";
import type { ActivityEvent } from "@/lib/activity";
import { TodayScheduleCard } from "@/components/calendar/TodayScheduleCard";
import { TodayTasksCard } from "@/components/clickup/TodayTasksCard";
import { DueTodosCard } from "@/components/todos/DueTodosCard";

interface HomeData {
  status: string;
  capturesToday: number;
  mealsToday: number;
  totals: { calories: number };
  goals: { calories: number };
  recentActivity: ActivityEvent[];
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [vpsOnline, setVpsOnline] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/home");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setVpsOnline(d.vps === "online"))
      .catch(() => setVpsOnline(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Capture / meal now live in the right sidebar — refresh stats + activity
  // when one lands so Home stays in sync.
  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener("inbox:updated", onUpdate);
    return () => window.removeEventListener("inbox:updated", onUpdate);
  }, [load]);

  const calories = data ? Math.round(data.totals.calories) : 0;
  const goal = data?.goals.calories ?? 2200;
  const remaining = Math.max(0, goal - calories);
  const calPct = goal > 0 ? calories / goal : 0;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="app-screen app-screen-home">
      {/* Header — desktop shows subtitle; mobile shows full title */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 md:pb-5">
        <div>
          <p className="app-section-label md:hidden">
            Luna Apps
          </p>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
            <span className="md:hidden">Agent OS</span>
            <span className="hidden md:inline">Command center</span>
          </h1>
          <p className="mt-0.5 hidden text-sm text-slate-500 md:block">
            {todayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {vpsOnline !== null && (
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold text-white shadow-sm md:hidden ${
                vpsOnline
                  ? "bg-emerald-500 shadow-emerald-200"
                  : "bg-red-500 shadow-red-200"
              }`}
            >
              {vpsOnline ? "VPS online" : "VPS offline"}
            </span>
          )}
          <RecentActivityButton events={data?.recentActivity ?? []} />
        </div>
      </header>

      {/* Hero — full width; stats beside ring on desktop */}
      <section className="app-hero md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1">
            <p className="app-section-label-invert">
              Today&apos;s overview
            </p>
            <div className="mt-3 flex items-center gap-5 md:gap-6">
              <div className="shrink-0 md:hidden">
                <ProgressRing
                  value={calories}
                  max={goal}
                  color="rgba(255,255,255,0.92)"
                  trackColor="rgba(255,255,255,0.22)"
                  size={84}
                  strokeWidth={8}
                >
                  <div className="text-center">
                    <p className="text-lg font-bold tabular-nums text-white">
                      {calories}
                    </p>
                    <p className="text-[10px] text-white/70">kcal</p>
                  </div>
                </ProgressRing>
              </div>
              <div className="hidden shrink-0 md:block">
                <ProgressRing
                  value={calories}
                  max={goal}
                  color="rgba(255,255,255,0.92)"
                  trackColor="rgba(255,255,255,0.22)"
                  size={104}
                  strokeWidth={9}
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {calories}
                    </p>
                    <p className="text-[10px] text-white/70">kcal eaten</p>
                  </div>
                </ProgressRing>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-3xl font-bold tabular-nums leading-none text-white md:text-4xl">
                  {remaining}
                </p>
                <p className="mt-1 text-sm text-white/75">kcal remaining</p>
                <p className="mt-2 text-xs text-white/55">
                  {Math.round(calPct * 100)}% of {goal} kcal goal ·{" "}
                  {data?.mealsToday ?? 0} meals · {data?.capturesToday ?? 0}{" "}
                  captures
                </p>
              </div>
            </div>
          </div>

          {/* Inline stats inside hero on large screens */}
          <div className="hidden shrink-0 lg:grid lg:grid-cols-2 lg:gap-2.5 xl:grid-cols-4">
            <div className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-sm xl:min-w-[7rem]">
              <p className="text-xl font-bold tabular-nums text-white">
                {data?.capturesToday ?? "—"}
              </p>
              <p className="app-section-label-invert">
                Captures
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-sm xl:min-w-[7rem]">
              <p className="text-xl font-bold tabular-nums text-white">
                {data?.mealsToday ?? "—"}
              </p>
              <p className="app-section-label-invert">
                Meals
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-sm xl:min-w-[7rem]">
              <p className="text-xl font-bold tabular-nums text-white">
                {calories || "—"}
              </p>
              <p className="app-section-label-invert">
                Calories
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-sm xl:min-w-[7rem]">
              <p className="text-xl font-bold tabular-nums text-white">{goal}</p>
              <p className="app-section-label-invert">
                Goal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats row — mobile + tablet (hidden on lg where stats live in hero) */}
      <section className="space-y-3 lg:hidden">
        <p className="app-section-label">Today at a glance</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5">
          <StatCard
            label="Captures"
            value={data?.capturesToday ?? "—"}
            variant="blue"
          />
          <StatCard
            label="Meals logged"
            value={data?.mealsToday ?? "—"}
            variant="emerald"
          />
          <StatCard label="Calories" value={calories || "—"} variant="violet" />
          <StatCard label="Goal" value={goal} variant="amber" />
        </div>
      </section>

      {/* Today's cards — fill the viewport now that activity moved to the top bar */}
      <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        <TodayScheduleCard />
        <TodayTasksCard />
        <DueTodosCard />
      </div>

      {/* Coming soon — full width */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 shadow-lg shadow-indigo-200/60 md:p-5">
        <p className="text-sm font-bold text-white">Coming soon</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/75">
          Finance dashboards, project health, and agent status will land here —
          same PWA, more domains.
        </p>
      </div>
    </div>
  );
}
