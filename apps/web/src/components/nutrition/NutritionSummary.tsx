"use client";

import ProgressRing from "@/components/ProgressRing";
import type { DailyTotals, MacroGoals } from "./types";

const MACROS = [
  { key: "protein_g" as const, label: "Protein", unit: "g", bar: "bg-blue-500" },
  { key: "carb_g" as const, label: "Carbs", unit: "g", bar: "bg-emerald-500" },
  { key: "fat_g" as const, label: "Fat", unit: "g", bar: "bg-amber-500" },
];

export default function NutritionSummary({
  totals,
  goals,
  heroLabel = "Today's calories",
  stacked = false,
}: {
  totals: DailyTotals;
  goals: MacroGoals;
  /** Hero caption — switches to a date when reviewing a past day. */
  heroLabel?: string;
  /** Stacked layout: hero full-width, macros as a row below. For narrow columns. */
  stacked?: boolean;
}) {
  const remaining = Math.max(0, Math.round(goals.calories - totals.calories));

  const hero = (
    <div className={`app-hero p-4 md:p-5 ${stacked ? "" : "md:col-span-5 lg:col-span-4"}`}>
      <p className="app-section-label-invert">{heroLabel}</p>
      <div className="mt-3 flex items-center gap-4 md:gap-5">
        <ProgressRing
          value={totals.calories}
          max={goals.calories}
          color="rgba(255,255,255,0.9)"
          trackColor="rgba(255,255,255,0.2)"
          size={80}
          strokeWidth={8}
        >
          <div className="text-center">
            <div className="text-base font-bold tabular-nums text-white md:text-lg">
              {Math.round(totals.calories)}
            </div>
            <div className="text-[10px] text-white/70">kcal</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums text-white">
            {remaining}
          </p>
          <p className="text-xs text-white/70">kcal remaining</p>
          <p className="mt-1 text-xs text-white/55">
            {totals.meal_count} {totals.meal_count === 1 ? "meal" : "meals"} ·
            goal {goals.calories} kcal
          </p>
        </div>
      </div>
    </div>
  );

  const macros = (
    <div className={stacked ? "grid grid-cols-3 gap-2" : "grid grid-cols-3 gap-3 md:col-span-7 lg:col-span-8"}>
      {MACROS.map(({ key, label, unit, bar }) => {
        const value = totals[key];
        const goal = goals[key];
        const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
        return (
          <div
            key={key}
            className={`app-card flex flex-col justify-center gap-1.5 p-3 ${stacked ? "" : "h-full md:p-4"}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="text-sm font-bold tabular-nums text-slate-900">
              {Math.round(value)}
              <span className="text-xs font-medium text-slate-400">
                {" "}
                / {goal}
                {unit}
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (stacked) {
    return (
      <div className="shrink-0 space-y-2">
        {hero}
        {macros}
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div className="grid gap-3 md:grid-cols-12 md:gap-4">
        {hero}
        {macros}
      </div>
    </div>
  );
}
