"use client";

import ProgressRing from "@/components/ProgressRing";
import type { DailyTotals, MacroGoals } from "./types";

const MACROS = [
  { key: "protein_g" as const, label: "Protein", unit: "g" },
  { key: "carb_g" as const, label: "Carbs", unit: "g" },
  { key: "fat_g" as const, label: "Fat", unit: "g" },
];

export default function NutritionSummary({
  totals,
  goals,
  embedded = false,
}: {
  totals: DailyTotals;
  goals: MacroGoals;
  /** Left column on desktop — no full-bleed mobile chrome */
  embedded?: boolean;
}) {
  const remaining = Math.max(0, Math.round(goals.calories - totals.calories));

  return (
    <div
      className={`shrink-0 space-y-3 ${embedded
          ? ""
          : "border-b border-slate-100 bg-slate-50/80 px-4 py-3 backdrop-blur-sm"
        }`}
    >
      <div className="app-hero md:p-5">
        <p className="app-section-label-invert">
          Today&apos;s calories
        </p>
        <div className="mt-3 flex items-center gap-5 md:gap-6">
          <ProgressRing
            value={totals.calories}
            max={goals.calories}
            color="rgba(255,255,255,0.9)"
            trackColor="rgba(255,255,255,0.2)"
            size={88}
            strokeWidth={9}
          >
            <div className="text-center">
              <div className="text-lg font-bold tabular-nums text-white md:text-xl">
                {Math.round(totals.calories)}
              </div>
              <div className="text-[10px] text-white/70">kcal</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold tabular-nums text-white">{remaining}</p>
            <p className="text-xs text-white/70">kcal remaining</p>
            <p className="mt-1 text-xs text-white/55">
              {totals.meal_count} {totals.meal_count === 1 ? "meal" : "meals"} ·
              goal {goals.calories} kcal
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MACROS.map(({ key, label, unit }) => {
          const value = totals[key];
          const goal = goals[key];
          const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
          return (
            <div key={key} className="app-card py-2.5 text-center">
              <p className="text-sm font-bold tabular-nums text-slate-900">
                {Math.round(value)}
                {unit}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
              <div className="mx-auto mt-1.5 h-1 max-w-[3.5rem] overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
