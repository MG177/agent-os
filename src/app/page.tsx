"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProgressRing from "@/components/ProgressRing";
import { ActivityRow } from "@/components/ui/ActivityRow";
import { StatCard } from "@/components/ui/StatCard";
import { QuickActionChip } from "@/components/ui/QuickActionChip";
import { QuickActionCard } from "@/components/ui/QuickActionCard";
import type { ActivityEvent } from "@/lib/activity";
import { QuickCaptureField } from "@/components/QuickCaptureField";
import { TodayScheduleCard } from "@/components/calendar/TodayScheduleCard";

interface HomeData {
  status: string;
  capturesToday: number;
  mealsToday: number;
  totals: { calories: number };
  goals: { calories: number };
  recentActivity: ActivityEvent[];
}

const QUICK_ACTIONS = [
  {
    href: "/capture",
    label: "Quick note",
    title: "Quick note",
    description: "Save to vault · Inbox",
    variant: "blue" as const,
    icon: "✎",
  },
  {
    href: "/nutrition?view=log",
    label: "Log meal",
    title: "Log meal",
    description: "Manual entry",
    variant: "emerald" as const,
    icon: "+",
  },
  {
    href: "/nutrition?view=ai",
    label: "Photo meal",
    title: "Photo meal",
    description: "AI vision extract",
    variant: "violet" as const,
    icon: "📷",
  },
  {
    href: "/nutrition",
    label: "Daily summary",
    title: "Daily summary",
    description: "Today totals",
    variant: "indigo" as const,
    icon: "✦",
  },
  {
    href: "/calendar",
    label: "Calendar",
    title: "Calendar",
    description: "Google schedule",
    variant: "blue" as const,
    icon: "📅",
  },
];

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/home");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
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
        <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-emerald-200 md:hidden">
          VPS online
        </span>
      </header>

      {/* Hero — full width; stats beside ring on desktop */}
      <section className="app-hero md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="app-section-label-invert">
              Today&apos;s overview
            </p>
            <div className="mt-4 flex items-center gap-6 md:gap-8">
              <div className="shrink-0 md:hidden">
                <ProgressRing
                  value={calories}
                  max={goal}
                  color="rgba(255,255,255,0.92)"
                  trackColor="rgba(255,255,255,0.22)"
                  size={96}
                  strokeWidth={9}
                >
                  <div className="text-center">
                    <p className="text-xl font-bold tabular-nums text-white">
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
                  size={120}
                  strokeWidth={10}
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
                <p className="text-3xl font-bold tabular-nums leading-none text-white md:text-4xl lg:text-5xl">
                  {remaining}
                </p>
                <p className="mt-1 text-sm text-white/75 md:text-base">
                  kcal remaining
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20 md:max-w-md">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${Math.min(100, calPct * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/55 md:text-sm">
                  {Math.round(calPct * 100)}% of {goal} kcal goal ·{" "}
                  {data?.mealsToday ?? 0} meals · {data?.capturesToday ?? 0}{" "}
                  captures
                </p>
              </div>
            </div>
          </div>

          {/* Inline stats inside hero on large screens */}
          <div className="hidden shrink-0 lg:grid lg:w-72 lg:grid-cols-2 lg:gap-3">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tabular-nums text-white">
                {data?.capturesToday ?? "—"}
              </p>
              <p className="app-section-label-invert">
                Captures
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tabular-nums text-white">
                {data?.mealsToday ?? "—"}
              </p>
              <p className="app-section-label-invert">
                Meals
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tabular-nums text-white">
                {calories || "—"}
              </p>
              <p className="app-section-label-invert">
                Calories
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tabular-nums text-white">{goal}</p>
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

      {/* Desktop main grid: actions | activity */}
      <div className="md:grid md:grid-cols-12 md:items-start md:gap-6 lg:gap-8">
        <div className="space-y-5 md:col-span-6 lg:col-span-5">
          <section className="space-y-3">
            <p className="app-section-label">Quick actions</p>
            {/* Mobile / narrow: horizontal chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {QUICK_ACTIONS.map((a) => (
                <QuickActionChip
                  key={`${a.href}-${a.title}`}
                  href={a.href}
                  label={a.label}
                  variant={a.variant}
                  icon={a.icon}
                />
              ))}
            </div>
            {/* Tablet+: compact grid that scales for more actions */}
            <div className="hidden grid-cols-2 gap-2.5 md:grid md:auto-rows-fr">
              {QUICK_ACTIONS.map((a) => (
                <QuickActionCard
                  key={`${a.href}-${a.title}`}
                  href={a.href}
                  title={a.title}
                  description={a.description}
                  variant={a.variant}
                  icon={a.icon}
                  layout="grid"
                />
              ))}
            </div>
          </section>

          <div className="hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 shadow-lg shadow-indigo-200/60 md:block lg:p-6">
            <p className="text-sm font-bold text-white">Coming soon</p>
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Finance dashboards, project health, and agent status will land here
              — same PWA, more domains.
            </p>
          </div>
        </div>

        <div className="mt-2 space-y-5 md:col-span-6 md:mt-0 lg:col-span-7">
          <QuickCaptureField onSaved={load} />

          <TodayScheduleCard />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="app-section-label">Recent activity</p>
              <Link
                href="/activity"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              {!data?.recentActivity.length ? (
                <p className="px-6 py-16 text-center text-sm text-slate-400">
                  No activity yet — capture a note or log a meal
                </p>
              ) : (
                <div className="divide-y divide-slate-50 px-5 py-2">
                  {data.recentActivity.map((event) => (
                    <ActivityRow key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/activity"
              className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 md:hidden"
            >
              View all activity →
            </Link>
          </section>
        </div>
      </div>

      {/* Coming soon — mobile only */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-center shadow-lg shadow-indigo-200/60 md:hidden">
        <p className="text-sm font-bold text-white">Coming soon</p>
        <p className="mt-1 text-xs text-white/75">
          Finance · Projects · Agent status
        </p>
      </div>
    </div>
  );
}
