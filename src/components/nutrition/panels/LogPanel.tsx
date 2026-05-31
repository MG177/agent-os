"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchField from "@/components/ui/SearchField";
import type { FoodEntry, LogEntry } from "../types";

const FREQUENT_PREVIEW = 5;

export default function LogPanel({ onSuccess }: { onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodEntry[]>([]);
  const [selected, setSelected] = useState<FoodEntry | null>(null);
  const [quantity, setQuantity] = useState(250);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allFoods, setAllFoods] = useState<FoodEntry[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/nutrition/foods")
      .then((r) => r.json())
      .then((d) => setAllFoods(d.foods || []));
  }, []);

  const loadLog = useCallback(() => {
    fetch("/api/nutrition/log")
      .then((r) => r.json())
      .then((d) => setLogEntries(d.entries || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    const onUpdate = () => loadLog();
    window.addEventListener("nutrition:updated", onUpdate);
    return () => window.removeEventListener("nutrition:updated", onUpdate);
  }, [loadLog]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      allFoods
        .filter(
          (f) =>
            f.display_name.toLowerCase().includes(q) || f.key.includes(q),
        )
        .slice(0, 6),
    );
  }, [query, allFoods, selected]);

  /** Foods ranked by how often they appear in the log, mapped to library items. */
  const frequent = useMemo(() => {
    if (!allFoods.length || !logEntries.length) return [];
    const byName = new Map<string, FoodEntry>();
    for (const f of allFoods) byName.set(f.display_name.toLowerCase(), f);
    const counts = new Map<string, number>();
    for (const e of logEntries) {
      const key = e.food_name?.toLowerCase();
      if (!key || !byName.has(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ food: byName.get(key)!, count }));
  }, [allFoods, logEntries]);

  const showFrequent = !query.trim() && !selected && frequent.length > 0;
  const visibleFrequent = showAllFrequent
    ? frequent
    : frequent.slice(0, FREQUENT_PREVIEW);

  const selectFood = useCallback((food: FoodEntry) => {
    setSelected(food);
    setQuery(food.display_name);
    setResults([]);
  }, []);

  const nutrition = selected?.per_100g;
  const preview =
    nutrition && quantity > 0
      ? { calories: Math.round(((nutrition.calories * quantity) / 100) * 10) / 10 }
      : null;

  const handleSave = useCallback(async () => {
    setError("");
    if (!selected) {
      setError("Search and select a food from your library");
      return;
    }
    if (!quantity) {
      setError("Enter a portion");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/nutrition/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        food_name: selected.display_name,
        quantity_grams: quantity,
      }),
    });

    if (res.ok) {
      setQuery("");
      setSelected(null);
      setQuantity(250);
      loadLog();
      onSuccess();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }, [selected, quantity, loadLog, onSuccess]);

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
        }}
        onClear={() => {
          setQuery("");
          setSelected(null);
          inputRef.current?.focus();
        }}
        placeholder="Search food library…"
        aria-label="Search food library"
      />

      {allFoods.length === 0 && (
        <p className="text-xs text-slate-600">
          No foods in library yet — add items under the Library tab first.
        </p>
      )}

      {/* Tap-to-log: most frequently logged foods, no search needed. */}
      {showFrequent && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">Most logged</p>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1 lg:max-h-[28rem]">
            {visibleFrequent.map(({ food, count }) => (
              <button
                key={food.key}
                type="button"
                onClick={() => selectFood(food)}
                className="app-card flex w-full items-center justify-between gap-3 text-left transition-colors hover:border-blue-200"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {food.display_name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {food.per_100g.calories} kcal per 100g
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                  {count}×
                </span>
              </button>
            ))}
          </div>
          {frequent.length > FREQUENT_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllFrequent((v) => !v)}
              className="w-full rounded-xl py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              {showAllFrequent
                ? "Show less"
                : `Show more (${frequent.length - FREQUENT_PREVIEW})`}
            </button>
          )}
        </section>
      )}

      {!showFrequent && !selected && allFoods.length > 0 && !query.trim() && (
        <p className="text-xs text-slate-500">
          Search your food library to log a meal.
        </p>
      )}

      <div className="space-y-2">
        {results.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => selectFood(f)}
            className="app-card w-full text-left transition-colors hover:border-blue-200"
          >
            <p className="text-sm font-medium text-slate-800">
              {f.display_name}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {f.per_100g.calories} kcal per 100g
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <section className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Portion</p>
            <div className="app-card flex items-center justify-between">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, q - 25))}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-slate-600 hover:bg-slate-50"
                aria-label="Decrease portion"
              >
                −
              </button>
              <span className="text-lg font-semibold tabular-nums text-slate-900">
                {quantity} g
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 25)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-slate-600 hover:bg-slate-50"
                aria-label="Increase portion"
              >
                +
              </button>
            </div>
            {preview && (
              <p className="text-center text-xs text-slate-500">
                ≈ {preview.calories} kcal
              </p>
            )}
          </section>

          {error && (
            <p className="text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="app-btn-primary"
          >
            {saving ? "Logging…" : "Log meal"}
          </button>
        </>
      )}
    </div>
  );
}
