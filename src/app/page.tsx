"use client";

import { useEffect } from "react";
import ProgressRing from "@/components/ProgressRing";
import { RecentActivityButton } from "@/components/activity/RecentActivityButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { ActivityEvent } from "@/lib/activity";
import { TodayScheduleCard } from "@/components/calendar/TodayScheduleCard";
import { TodayTasksCard } from "@/components/clickup/TodayTasksCard";
import { DueTodosCard } from "@/components/todos/DueTodosCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Grid, Page, PageBody } from "@/components/ui/layout";
import { useResource } from "@/lib/data/useResource";
import { KEYS } from "@/lib/data/keys";

interface HomeData {
  status: string;
  capturesToday: number;
  mealsToday: number;
  totals: { calories: number };
  goals: { calories: number };
  recentActivity: ActivityEvent[];
}

interface HealthData {
  vps: string;
}

/** Frosted stat tile inside the home hero (all breakpoints). */
function HeroStat({
  loading,
  value,
  label,
  className = "",
}: {
  loading: boolean;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg bg-white/15 px-1.5 py-1 backdrop-blur-sm md:rounded-xl md:px-2.5 md:py-1.5 xl:min-w-[6rem] ${className}`.trim()}
    >
      {loading ? (
        <span className="block h-4 w-6 animate-pulse rounded bg-white/25 md:h-5 md:w-8" />
      ) : (
        <p className="text-sm font-bold tabular-nums text-white md:text-lg">{value}</p>
      )}
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/70 md:text-[9px]">
        {label}
      </p>
    </div>
  );
}

export default function HomePage() {
  const { data, mutate: refreshHome } = useResource<HomeData>(KEYS.home);
  const { data: healthData } = useResource<HealthData>(KEYS.health);

  const vpsOnline = healthData ? healthData.vps === "online" : null;

  // Refresh home stats when a capture or meal lands via QuickCapture.
  useEffect(() => {
    const onUpdate = () => refreshHome();
    window.addEventListener("inbox:updated", onUpdate);
    return () => window.removeEventListener("inbox:updated", onUpdate);
  }, [refreshHome]);

  const calories = data ? Math.round(data.totals.calories) : 0;
  const goal = data?.goals.calories ?? 2200;
  const remaining = Math.max(0, goal - calories);
  const calPct = goal > 0 ? calories / goal : 0;
  const loading = !data;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Page variant="dashboard">
      <PageHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-section-label md:hidden">Luna Apps</p>
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
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold text-white shadow-sm md:hidden ${vpsOnline
                  ? "bg-emerald-500 shadow-emerald-200"
                  : "bg-red-500 shadow-red-200"
                  }`}
              >
                {vpsOnline ? "VPS online" : "VPS offline"}
              </span>
            )}
            <RecentActivityButton events={data?.recentActivity ?? []} />
          </div>
        </div>
      </PageHeader>

      <PageBody>
        {/* Hero — ring + remaining + stat tiles in one compact row */}
        <section className="app-hero !p-3 md:!p-4">
          <p className="app-section-label-invert">Today&apos;s overview</p>
          <div className="mt-1 flex items-center gap-2 md:mt-1.5 md:gap-3 lg:gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-4">
              <div className="shrink-0">
                <ProgressRing
                  value={calories}
                  max={goal}
                  color="rgba(255,255,255,0.92)"
                  trackColor="rgba(255,255,255,0.22)"
                  size={52}
                  strokeWidth={6}
                  className="md:hidden"
                >
                  <div className="text-center">
                    {loading ? (
                      <span className="mx-auto block h-3.5 w-7 animate-pulse rounded bg-white/30" />
                    ) : (
                      <>
                        <p className="text-sm font-bold tabular-nums text-white">
                          {calories}
                        </p>
                        <p className="text-[8px] text-white/70">kcal</p>
                      </>
                    )}
                  </div>
                </ProgressRing>
                <ProgressRing
                  value={calories}
                  max={goal}
                  color="rgba(255,255,255,0.92)"
                  trackColor="rgba(255,255,255,0.22)"
                  size={80}
                  strokeWidth={7}
                  className="hidden md:flex"
                >
                  <div className="text-center">
                    {loading ? (
                      <span className="mx-auto block h-6 w-10 animate-pulse rounded bg-white/30" />
                    ) : (
                      <>
                        <p className="text-xl font-bold tabular-nums text-white">
                          {calories}
                        </p>
                        <p className="text-[9px] text-white/70">kcal eaten</p>
                      </>
                    )}
                  </div>
                </ProgressRing>
              </div>
              <div className="min-w-0 flex-1">
                {loading ? (
                  <>
                    <span className="block h-7 w-24 animate-pulse rounded-lg bg-white/25 md:h-8" />
                    <p className="mt-0.5 text-[11px] text-white/75 md:text-xs">
                      kcal remaining
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold tabular-nums leading-none text-white md:text-3xl">
                      {remaining}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/75 md:text-xs">
                      kcal remaining
                    </p>
                    <p className="mt-0.5 hidden text-[11px] text-white/55 sm:block">
                      {Math.round(calPct * 100)}% of {goal} kcal goal
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-1 md:grid-cols-4 md:gap-1.5 lg:gap-2">
              <HeroStat
                loading={loading}
                value={data?.capturesToday ?? "—"}
                label="Captures"
              />
              <HeroStat
                loading={loading}
                value={data?.mealsToday ?? "—"}
                label="Meals"
              />
              <HeroStat
                loading={loading}
                value={calories || "—"}
                label="Calories"
                className="hidden md:block"
              />
              <HeroStat
                loading={loading}
                value={goal}
                label="Goal"
                className="hidden md:block"
              />
            </div>
          </div>
        </section>

        {/* Schedule + tasks (left) · reminders rail (right, full height) */}
        <Grid cols={3} className="lg:grid-cols-2 lg:gap-6 2xl:grid-cols-3">
          <div className="flex min-h-0 w-full flex-col self-start md:col-span-2 xl:col-span-2">
            <ErrorBoundary>
              <TodayScheduleCard />
            </ErrorBoundary>
          </div>
          <div className="flex min-h-0 flex-col md:col-start-2 md:row-start-2 xl:col-start-3 xl:row-span-2 xl:row-start-1">
            <ErrorBoundary>
              <DueTodosCard />
            </ErrorBoundary>
          </div>
          <div className="flex min-h-0 flex-col md:col-start-1 md:row-start-2 md:col-span-1 xl:col-span-2 xl:row-start-2">
            <ErrorBoundary>
              <TodayTasksCard />
            </ErrorBoundary>
          </div>
        </Grid>

        {/* Coming soon — full width */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 shadow-lg shadow-indigo-200/60 md:p-5">
          <p className="text-sm font-bold text-white">Coming soon</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/75">
            Finance dashboards, project health, and agent status will land here —
            same PWA, more domains.
          </p>
        </div>
      </PageBody>
    </Page>
  );
}
