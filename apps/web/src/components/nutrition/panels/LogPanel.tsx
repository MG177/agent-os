"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchField from "@/components/ui/SearchField";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { FoodEntry } from "../types";

const FREQUENT_PREVIEW = 5;

export default function LogPanel({ onSuccess }: { onSuccess: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodEntry[]>([]);
  const [selected, setSelected] = useState<FoodEntry | null>(null);
  const [quantity, setQuantity] = useState(250);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allFoods, setAllFoods] = useState<FoodEntry[]>([]);
  const [foodFrequency, setFoodFrequency] = useState<{ food_name: string; count: number }[]>([]);
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/nutrition/foods")
      .then((r) => r.json())
      .then((d) => setAllFoods(d.foods || []));
  }, []);

  const loadFrequency = useCallback(() => {
    fetch("/api/nutrition/log?alltime=true")
      .then((r) => r.json())
      .then((d) => setFoodFrequency(d.frequency || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFrequency();
  }, [loadFrequency]);

  useEffect(() => {
    const onUpdate = () => loadFrequency();
    window.addEventListener("nutrition:updated", onUpdate);
    return () => window.removeEventListener("nutrition:updated", onUpdate);
  }, [loadFrequency]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced so the result filter runs once the user pauses, not per keystroke.
  const debouncedQuery = useDebouncedValue(query, 200);
  useEffect(() => {
    if (!debouncedQuery.trim() || selected) {
      setResults([]);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    setResults(
      allFoods
        .filter(
          (f) =>
            f.display_name.toLowerCase().includes(q) || f.key.includes(q),
        )
        .slice(0, 6),
    );
  }, [debouncedQuery, allFoods, selected]);

  /** Foods ranked by all-time log frequency, mapped to library items. */
  const frequent = useMemo(() => {
    if (!allFoods.length || !foodFrequency.length) return [];
    const byName = new Map<string, FoodEntry>();
    for (const f of allFoods) byName.set(f.display_name.toLowerCase(), f);
    return foodFrequency
      .filter((r) => byName.has(r.food_name.toLowerCase()))
      .map((r) => ({ food: byName.get(r.food_name.toLowerCase())!, count: r.count }));
  }, [allFoods, foodFrequency]);

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
      loadFrequency();
      onSuccess();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }, [selected, quantity, loadFrequency, onSuccess]);

  return (
    <div className="flex flex-col gap-3">
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
        <p className="text-xs text-slate-500">
          No foods in library yet. Visit the{" "}
          <a href="/nutrition" className="font-semibold text-primary hover:underline">
            Nutrition page
          </a>{" "}
          to add items.
        </p>
      )}

      {/* Tap-to-log: most frequently logged foods, no search needed. */}
      {showFrequent && (
        <section className="space-y-2">
          <p className="app-section-label">Most logged</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {visibleFrequent.map(({ food, count }) => (
              <button
                key={food.key}
                type="button"
                onClick={() => selectFood(food)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-primary/30"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {food.display_name}
                  </span>
                  <span className="mt-0.5 flex gap-2 text-[11px]">
                    <span className="font-semibold text-primary">{food.per_100g.protein_g}g</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-emerald-600">{food.per_100g.carb_g}g</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-amber-600">{food.per_100g.fat_g}g</span>
                    <span className="text-slate-400">· {food.per_100g.calories} kcal</span>
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
              className="w-full rounded-2xl py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
            >
              {showAllFrequent
                ? "Show less"
                : `Show more (${frequent.length - FREQUENT_PREVIEW})`}
            </button>
          )}
        </section>
      )}

      {!showFrequent && !selected && allFoods.length > 0 && !query.trim() && (
        <p className="text-xs text-slate-400">Search your food library to log a meal.</p>
      )}

      <div className="space-y-1.5">
        {results.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => selectFood(f)}
            className="flex w-full flex-col rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-primary/30"
          >
            <p className="text-sm font-medium text-slate-800">{f.display_name}</p>
            <span className="mt-0.5 flex gap-2 text-[11px]">
              <span className="font-semibold text-primary">{f.per_100g.protein_g}g</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-emerald-600">{f.per_100g.carb_g}g</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-amber-600">{f.per_100g.fat_g}g</span>
              <span className="text-slate-400">· {f.per_100g.calories} kcal</span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <section className="space-y-2">
            <p className="app-section-label">Portion</p>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-2 py-2 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, q - 25))}
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-lg text-slate-600 hover:bg-slate-50"
                aria-label="Decrease portion"
              >
                −
              </button>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={quantity === 0 ? "" : quantity}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQuantity(Number.isNaN(n) ? 0 : Math.max(0, n));
                  }}
                  placeholder="0"
                  aria-label="Portion in grams"
                  className="w-14 bg-transparent text-center text-base font-semibold tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-base font-semibold text-slate-900">g</span>
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 25)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-lg text-slate-600 hover:bg-slate-50"
                aria-label="Increase portion"
              >
                +
              </button>
            </div>
            {preview && (
              <p className="text-center text-xs text-slate-400">≈ {preview.calories} kcal</p>
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
