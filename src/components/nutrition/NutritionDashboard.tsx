"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NutritionGoalsSheet from "./NutritionGoalsSheet";
import NutritionSegments from "./NutritionSegments";
import NutritionSummary from "./NutritionSummary";
import ChatPanel from "./panels/ChatPanel";
import LibraryPanel from "./panels/LibraryPanel";
import LogPanel from "./panels/LogPanel";
import TodayPanel from "./panels/TodayPanel";
import {
  parseNutritionView,
  type DailyTotals,
  type LogEntry,
  type MacroGoals,
  type NutritionView,
} from "./types";

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

type WorkspaceView = Exclude<NutritionView, "today">;

function WorkspacePanel({
  panel,
  onLogSuccess,
  onOpenAi,
  onMealLoggedRefresh,
}: {
  panel: WorkspaceView;
  onLogSuccess: () => void;
  onOpenAi: () => void;
  onMealLoggedRefresh: () => void;
}) {
  switch (panel) {
    case "log":
      return <LogPanel onSuccess={onLogSuccess} onOpenAi={onOpenAi} />;
    case "library":
      return <LibraryPanel />;
    case "ai":
      return <ChatPanel onMealLogged={onMealLoggedRefresh} />;
    default:
      return null;
  }
}

function NutritionDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseNutritionView(searchParams.get("view"));
  const goalsOpen = searchParams.get("goals") === "1";

  const desktopPanel: WorkspaceView =
    view === "today" ? "log" : view;

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<MacroGoals>(DEFAULT_GOALS);
  const [totals, setTotals] = useState<DailyTotals>(EMPTY_TOTALS);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const refresh = useCallback(async () => {
    const [logRes, goalsRes] = await Promise.all([
      fetch("/api/nutrition/log"),
      fetch("/api/nutrition/goals"),
    ]);
    const logData = await logRes.json();
    const goalsData = await goalsRes.json();
    setEntries(logData.entries || []);
    setTotals(logData.totals || EMPTY_TOTALS);
    setGoals(goalsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setView = useCallback(
    (next: NutritionView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "today") params.delete("view");
      else params.set("view", next);
      params.delete("goals");
      params.delete("tab");
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
    const res = await fetch(`/api/nutrition/log/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotals(data.totals);
    }
    setDeleting(null);
  }

  function handleMealLoggedMobile() {
    refresh();
    setView("today");
  }

  function handleMealLoggedDesktop() {
    refresh();
  }

  const workspaceClass = (panel: NutritionView | WorkspaceView) =>
    `min-h-0 flex-1 ${panel === "ai"
      ? "flex flex-col overflow-hidden"
      : "overflow-y-auto"
    }`;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden md:max-w-none">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 md:px-8 lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">Nutrition</h1>
          <p className="text-xs text-slate-400">{todayLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setGoalsOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label="Edit daily goals"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            className="h-4 w-4"
            aria-hidden
          >
            <circle cx={12} cy={12} r={3} />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          Goals
        </button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center px-4 text-sm text-slate-400">
          Loading…
        </div>
      ) : (
        <>
          {/* Mobile: stacked dashboard + all tabs */}
          <div className="flex min-h-0 flex-1 flex-col md:hidden">
            <NutritionSummary totals={totals} goals={goals} />
            <NutritionSegments view={view} onChange={setView} mode="mobile" />
            <div
              className={`px-4 py-4 ${workspaceClass(view)}`}
              role="tabpanel"
            >
              {view === "today" ? (
                <TodayPanel
                  entries={entries}
                  deleting={deleting}
                  onDelete={handleDelete}
                  onLogMeal={() => setView("log")}
                />
              ) : (
                <WorkspacePanel
                  panel={view}
                  onLogSuccess={handleMealLoggedMobile}
                  onOpenAi={() => setView("ai")}
                  onMealLoggedRefresh={refresh}
                />
              )}
            </div>
          </div>

          {/* Desktop: left = Log · Library · AI, right = summary + meals */}
          <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-12 md:gap-0 md:overflow-hidden lg:gap-0">
            <section className="col-span-7 flex min-h-0 flex-col overflow-hidden border-r border-slate-100 px-6 py-5 lg:col-span-8 lg:px-8">
              <NutritionSegments
                view={desktopPanel}
                onChange={setView}
                mode="desktop"
              />
              <div
                className={`pt-4 ${workspaceClass(desktopPanel)}`}
                role="tabpanel"
              >
                <WorkspacePanel
                  panel={desktopPanel}
                  onLogSuccess={handleMealLoggedDesktop}
                  onOpenAi={() => setView("ai")}
                  onMealLoggedRefresh={refresh}
                />
              </div>
            </section>

            <aside className="col-span-5 flex min-h-0 flex-col gap-4 overflow-hidden px-6 py-5 lg:col-span-4 lg:px-8">
              <NutritionSummary
                totals={totals}
                goals={goals}
                embedded
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <TodayPanel
                  entries={entries}
                  deleting={deleting}
                  onDelete={handleDelete}
                  onLogMeal={() => setView("log")}
                />
              </div>
            </aside>
          </div>
        </>
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
    </div>
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
