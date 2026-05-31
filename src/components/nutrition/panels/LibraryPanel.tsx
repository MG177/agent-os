"use client";

import { useEffect, useState } from "react";
import { Broccoli } from "lucide-react";
import SearchField from "@/components/ui/SearchField";
import type { FoodEntry } from "../types";

const MACRO_FIELDS = [
  {
    field: "calories" as const,
    label: "Calories",
    unit: "kcal",
    required: true,
  },
  { field: "protein_g" as const, label: "Protein", unit: "g", required: true },
  { field: "carb_g" as const, label: "Carbs", unit: "g", required: true },
  { field: "fat_g" as const, label: "Fat", unit: "g", required: true },
  {
    field: "fiber_g" as const,
    label: "Fiber",
    unit: "g",
    required: false,
  },
  {
    field: "sugar_g" as const,
    label: "Sugar",
    unit: "g",
    required: false,
  },
];

type FormField = (typeof MACRO_FIELDS)[number]["field"];
type FormState = { name: string } & Record<FormField, string>;

const EMPTY_FORM: FormState = {
  name: "",
  calories: "",
  protein_g: "",
  carb_g: "",
  fat_g: "",
  fiber_g: "",
  sugar_g: "",
};

export default function LibraryPanel() {
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/nutrition/foods")
      .then((r) => r.json())
      .then((d) => setFoods(d.foods || []));
  }, []);

  const filtered = query.trim()
    ? foods.filter((f) =>
      f.display_name.toLowerCase().includes(query.toLowerCase()),
    )
    : foods;

  async function handleAddFood() {
    setError("");
    if (!form.name.trim()) {
      setError("Food name is required");
      return;
    }

    for (const { field, label, required } of MACRO_FIELDS) {
      if (required && (!form[field] || isNaN(parseFloat(form[field])))) {
        setError(`${label} is required`);
        return;
      }
    }

    const per_100g: Record<string, number> = {};
    for (const { field } of MACRO_FIELDS) {
      const val = parseFloat(form[field]);
      if (!isNaN(val)) per_100g[field] = val;
    }

    setSaving(true);
    const res = await fetch("/api/nutrition/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ food_name: form.name.trim(), per_100g }),
    });

    if (res.ok) {
      const data = await res.json();
      setFoods((prev) => [
        { key: data.key, ...data.entry },
        ...prev.filter((f) => f.key !== data.key),
      ]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{foods.length} items</p>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
          }}
          className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-95 ${showForm
            ? "bg-slate-100 text-slate-600"
            : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700"
            }`}
        >
          {showForm ? "Cancel" : "Add food"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="app-section-label">
            New food (per 100g)
          </p>
          <input
            type="text"
            placeholder="Food name e.g. Chicken Breast"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-2xl border border-transparent bg-slate-50 px-4 py-3 text-sm font-medium transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-2 gap-3">
            {MACRO_FIELDS.map(({ field, label, unit, required }) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {label} ({unit})
                  {!required && (
                    <span className="ml-1 text-slate-300">optional</span>
                  )}
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [field]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          {error && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleAddFood}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save food"}
          </button>
        </div>
      )}

      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery("")}
        placeholder="Search foods…"
        aria-label="Search foods"
      />

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Broccoli strokeWidth={1.6} className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-600">
              {query ? "No foods match your search" : "No foods yet"}
            </p>
            {!query && (
              <p className="mt-1 text-xs text-slate-400">
                Add your first food with the button above
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((food) => (
              <div key={food.key} className="px-5 py-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {food.display_name}
                    </p>
                    <p className="mt-0.5 app-section-label">
                      per 100g
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-violet-600">
                    {food.per_100g.calories}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      kcal
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: "P",
                      value: food.per_100g.protein_g,
                      color: "bg-blue-50 text-blue-600",
                    },
                    {
                      label: "C",
                      value: food.per_100g.carb_g,
                      color: "bg-emerald-50 text-emerald-600",
                    },
                    {
                      label: "F",
                      value: food.per_100g.fat_g,
                      color: "bg-amber-50 text-amber-600",
                    },
                  ].map(({ label, value, color }) => (
                    <span
                      key={label}
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}
                    >
                      {label} {value}g
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
