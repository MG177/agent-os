"use client";

import type { NutritionView } from "./types";

const SEGMENTS: { id: NutritionView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "foods", label: "Foods" },
];

/** Mobile-only switch between today's meals and the food workspace. */
export default function NutritionSegments({
  view,
  onChange,
}: {
  view: NutritionView;
  onChange: (view: NutritionView) => void;
}) {
  return (
    <div
      className="flex gap-1.5"
      role="tablist"
      aria-label="Nutrition workspace"
    >
      {SEGMENTS.map(({ id, label }) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 text-xs font-semibold transition-colors ${
              active
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
