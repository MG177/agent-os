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
      className={`rounded-xl bg-white/15 px-2 py-1.5 backdrop-blur-sm md:rounded-2xl md:px-3.5 md:py-2.5 xl:min-w-[7rem] ${className}`.trim()}
    >
      {loading ? (
        <span className="block h-5 w-8 animate-pulse rounded bg-white/25 md:h-6 md:w-10" />
      ) : (
        <p className="text-base font-bold tabular-nums text-white md:text-xl">{value}</p>
      )}
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/70 md:text-[10px]">
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
        {/* Hero — ring + remaining; frosted stat tiles (stacked below on mobile, rail on lg+) */}
        <section className="app-hero p-4 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <p className="app-section-label-invert">Today&apos;s overview</p>
              <div className="mt-2 flex items-center gap-3 md:mt-3 md:gap-6">
                <div className="shrink-0">
                  <ProgressRing
                    value={calories}
                    max={goal}
                    color="rgba(255,255,255,0.92)"
                    trackColor="rgba(255,255,255,0.22)"
                    size={68}
                    strokeWidth={7}
                    className="md:hidden"
                  >
                    <div className="text-center">
                      {loading ? (
                        <span className="mx-auto block h-4 w-8 animate-pulse rounded bg-white/30" />
                      ) : (
                        <>
                          <p className="text-base font-bold tabular-nums text-white">
                            {calories}
                          </p>
                          <p className="text-[9px] text-white/70">kcal</p>
                        </>
                      )}
                    </div>
                  </ProgressRing>
                  <ProgressRing
                    value={calories}
                    max={goal}
                    color="rgba(255,255,255,0.92)"
                    trackColor="rgba(255,255,255,0.22)"
                    size={104}
                    strokeWidth={9}
                    className="hidden md:flex"
                  >
                    <div className="text-center">
                      {loading ? (
                        <span className="mx-auto block h-7 w-12 animate-pulse rounded bg-white/30" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold tabular-nums text-white">
                            {calories}
                          </p>
                          <p className="text-[10px] text-white/70">kcal eaten</p>
                        </>
                      )}
                    </div>
                  </ProgressRing>
                </div>
                <div className="min-w-0 flex-1">
                  {loading ? (
                    <>
                      <span className="block h-8 w-28 animate-pulse rounded-lg bg-white/25 md:h-10" />
                      <p className="mt-1 text-sm text-white/75">kcal remaining</p>
                      <span className="mt-2 block h-3 w-44 max-w-full animate-pulse rounded bg-white/15" />
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold tabular-nums leading-none text-white md:text-4xl">
                        {remaining}
                      </p>
                      <p className="mt-0.5 text-xs text-white/75 md:mt-1 md:text-sm">
                        kcal remaining
                      </p>
                      <p className="mt-1 hidden text-xs text-white/55 sm:block">
                        {Math.round(calPct * 100)}% of {goal} kcal goal
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5 lg:w-auto lg:grid-cols-2 xl:grid-cols-4">
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
