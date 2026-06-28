"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { addDaysToKey, localDateKey } from "@/components/calendar/calendar-utils";
import { DateTimePopover } from "@/components/todos/DateTimePopover";
import NutritionGoalsSheet from "./NutritionGoalsSheet";
import NutritionSegments from "./NutritionSegments";
import NutritionSummary from "./NutritionSummary";
import { LazyFoodWorkspace } from "@/components/lazy";
import TodayPanel from "./panels/TodayPanel";
import {
  parseNutritionView,
  type DailyTotals,
  type LogEntry,
  type MacroGoals,
  type NutritionView,
} from "./types";
import { Page, PageBody } from "@/components/ui/layout";
import { PageHeader } from "@/components/ui/PageHeader";

const EMPTY_TOTALS: DailyTotals = {
  calories: 0,
  protein_g: 0,
  carb_g: 0,
  fat_g: 0,
  meal_count: 0,
};

const DEFAULT_GOALS: MacroGoals = {
  calories: 2200,
  protein_g: 160,
  carb_g: 220,
  fat_g: 73,
};

function formatDayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === addDaysToKey(todayKey, -1)) return "Yesterday";
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function NutritionDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseNutritionView(searchParams.get("view"));
  const goalsOpen = searchParams.get("goals") === "1";

  // The AI assistant moved to its own /assistant route — redirect legacy deep-links.
  useEffect(() => {
    if (searchParams.get("view") === "ai") router.replace("/assistant");
  }, [searchParams, router]);

  const today = useMemo(() => localDateKey(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals>(DEFAULT_GOALS);
  const [totals, setTotals] = useState<DailyTotals>(EMPTY_TOTALS);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [logRes, goalsRes] = await Promise.all([
      fetch(`/api/nutrition/log?date=${selectedDate}`),
      fetch("/api/nutrition/goals"),
    ]);
    const logData = await logRes.json();
    const goalsData = await goalsRes.json();
    setEntries(logData.entries || []);
    setTotals(logData.totals || EMPTY_TOTALS);
    setGoals(goalsData);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when a meal is logged elsewhere (e.g. the quick-panel meal field).
  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("nutrition:updated", onUpdate);
    return () => window.removeEventListener("nutrition:updated", onUpdate);
  }, [refresh]);

  const setView = useCallback(
    (next: NutritionView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "today") params.delete("view");
      else params.set("view", next);
      params.delete("goals");
      const q = params.toString();
      router.replace(q ? `/nutrition?${q}` : "/nutrition", { scroll: false });
    },
    [router, searchParams],
  );

  const setGoalsOpen = useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (open) params.set("goals", "1");
      else params.delete("goals");
      const q = params.toString();
      router.replace(q ? `/nutrition?${q}` : "/nutrition", { scroll: false });
    },
    [router, searchParams],
  );

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await fetch(
      `/api/nutrition/log/${encodeURIComponent(id)}?date=${selectedDate}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotals(data.totals);
    }
    setDeleting(null);
  }

  async function handleEdit(id: string, quantityGrams: number): Promise<boolean> {
    const res = await fetch(
      `/api/nutrition/log/${encodeURIComponent(id)}?date=${selectedDate}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity_grams: quantityGrams }),
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    setEntries(data.entries);
    setTotals(data.totals);
    return true;
  }

  function handleMealLoggedMobile() {
    refresh();
    setView("today");
  }

  return (
    <Page variant="dashboard" scroll="inner">
      <PageHeader
        inset={false}
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-white/80 px-4 py-3 md:px-8 lg:px-10"
      >
        <div className="flex items-center gap-3 md:gap-4">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
            Nutrition
          </h1>
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysToKey(d, -1))}
              aria-label="Previous day"
              className="flex h-8 w-8 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronLeft strokeWidth={2} className="h-4 w-4" aria-hidden />
            </button>
            <DateTimePopover
              value={`${selectedDate}T00:00`}
              onChange={(v) => {
                if (v) setSelectedDate(v.slice(0, 10));
              }}
              mode="date"
              maxDate={new Date()}
              triggerLabel={formatDayLabel(selectedDate, today)}
              summaryLabel="Day"
              className="min-w-[6.5rem] justify-center text-sm font-semibold"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysToKey(d, 1))}
              disabled={isToday}
              aria-label="Next day"
              className="flex h-8 w-8 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight strokeWidth={2} className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => setGoalsOpen(true)}
            className="flex min-h-9 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Edit daily goals"
          >
            <Settings strokeWidth={1.8} className="h-4 w-4" aria-hidden />
            Goals
          </button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex flex-1 items-center justify-center px-4 text-sm text-slate-400">
          Loading…
        </div>
      ) : (
        <PageBody fill gap={false} className="py-4 md:overflow-hidden md:py-5">
          {/* Mobile: summary at top, then tabs + panels */}
          <div className="flex flex-col gap-4 md:hidden">
            <NutritionSummary
              totals={totals}
              goals={goals}
              heroLabel={isToday ? "Today's calories" : "Calories"}
            />
            <NutritionSegments view={view} onChange={setView} />
            {view === "today" ? (
              <TodayPanel
                entries={entries}
                deleting={deleting}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onLogMeal={() => setView("foods")}
              />
            ) : (
              <LazyFoodWorkspace
                logDate={selectedDate}
                onLogged={handleMealLoggedMobile}
              />
            )}
          </div>

          {/* Desktop: food workspace (left) · summary + meals today (right) */}
          <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-12 md:gap-5 md:overflow-hidden lg:gap-6">
            <section className="flex min-h-0 flex-col md:col-span-7 xl:col-span-8">
              <LazyFoodWorkspace
                logDate={selectedDate}
                onLogged={refresh}
              />
            </section>
            <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto px-1 py-1 md:col-span-5 xl:col-span-4">
              <NutritionSummary
                totals={totals}
                goals={goals}
                heroLabel={isToday ? "Today's calories" : "Calories"}
                stacked
              />
              <TodayPanel
                entries={entries}
                deleting={deleting}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onLogMeal={() => { }}
              />
            </aside>
          </div>
        </PageBody>
      )}

      <NutritionGoalsSheet
        open={goalsOpen}
        goals={goals}
        onClose={() => setGoalsOpen(false)}
        onSaved={(g) => {
          setGoals(g);
          refresh();
        }}
      />
    </Page>
  );
}

export default function NutritionDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      }
    >
      <NutritionDashboardInner />
    </Suspense>
  );
}
