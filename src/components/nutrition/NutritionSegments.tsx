"use client";

import type { NutritionView } from "./types";

const ALL_SEGMENTS: { id: NutritionView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "log", label: "Log" },
  { id: "library", label: "Library" },
  { id: "ai", label: "AI" },
];

const WORKSPACE_SEGMENTS = ALL_SEGMENTS.filter((s) => s.id !== "today");

export default function NutritionSegments({
  view,
  onChange,
  mode = "mobile",
}: {
  view: NutritionView;
  onChange: (view: NutritionView) => void;
  mode?: "mobile" | "desktop";
}) {
  const segments = mode === "desktop" ? WORKSPACE_SEGMENTS : ALL_SEGMENTS;
  const activeId = mode === "desktop" && view === "today" ? "log" : view;

  return (
    <div
      className={
        mode === "desktop"
          ? "shrink-0 border-b border-slate-200/80 bg-white py-2"
          : "shrink-0 border-b border-slate-200/80 bg-white px-4 py-2"
      }
      role="tablist"
      aria-label={
        mode === "desktop" ? "Nutrition actions" : "Nutrition workspace"
      }
    >
      <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {segments.map(({ id, label }) => {
          const active = activeId === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={`flex min-h-11 shrink-0 items-center rounded-2xl px-4 text-xs font-semibold transition-colors ${active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
