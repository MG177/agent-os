"use client";

import type { LogEntry } from "../types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TodayPanel({
  entries,
  deleting,
  onDelete,
  onLogMeal,
}: {
  entries: LogEntry[];
  deleting: string | null;
  onDelete: (timestamp: string) => void;
  onLogMeal: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="app-section-label">Meals today</p>
        <button
          type="button"
          onClick={onLogMeal}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          + Log meal
        </button>
      </div>

      <div className="app-card overflow-hidden p-0">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <p className="text-sm text-slate-400">No meals yet today</p>
            <button
              type="button"
              onClick={onLogMeal}
              className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Log your first meal →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {[...entries].reverse().map((entry) => (
              <li
                key={entry.timestamp}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {entry.food_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {Math.round(entry.consumed_nutrition.calories)} kcal ·{" "}
                    {Math.round(entry.quantity_grams)}g
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTime(entry.timestamp)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(entry.timestamp)}
                  disabled={deleting === entry.timestamp}
                  className="shrink-0 px-2 text-lg text-slate-300 hover:text-slate-600 disabled:opacity-40"
                  aria-label={`Remove ${entry.food_name}`}
                >
                  ⋯
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
