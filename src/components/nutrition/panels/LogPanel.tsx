"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SearchField from "@/components/ui/SearchField";
import type { FoodEntry } from "../types";

export default function LogPanel({
  onSuccess,
  onOpenAi,
}: {
  onSuccess: () => void;
  onOpenAi: () => void;
}) {
  const [tab, setTab] = useState<"manual" | "photo">("manual");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodEntry[]>([]);
  const [selected, setSelected] = useState<FoodEntry | null>(null);
  const [quantity, setQuantity] = useState(250);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [allFoods, setAllFoods] = useState<FoodEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/nutrition/foods")
      .then((r) => r.json())
      .then((d) => setAllFoods(d.foods || []));
  }, []);

  useEffect(() => {
    if (tab === "manual") inputRef.current?.focus();
  }, [tab]);

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
      onSuccess();
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }, [selected, quantity, onSuccess]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-slate-200">
        {(["manual", "photo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-11 flex-1 px-4 text-sm font-semibold capitalize transition-colors ${tab === t
                ? "border-b-2 border-blue-600 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {t === "manual" ? "Manual" : "Photo"}
          </button>
        ))}
      </div>

      {tab === "photo" ? (
        <div className="app-card flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Send a meal photo to the nutrition AI — it will estimate macros and
            log for you.
          </p>
          <button type="button" onClick={onOpenAi} className="app-btn-primary max-w-xs">
            Open AI chat
          </button>
          <p className="text-xs text-slate-400">
            Vision extraction runs in the AI tab (Gemini).
          </p>
        </div>
      ) : (
        <>
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

          <div className="space-y-2">
            {results.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setSelected(f);
                  setQuery(f.display_name);
                  setResults([]);
                }}
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
