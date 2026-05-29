"use client";

import { useEffect, useState } from "react";
import type { MacroGoals } from "./types";

const GOAL_FIELDS = [
  {
    key: "calories" as const,
    label: "Calories",
    unit: "kcal",
    color: "text-violet-600",
    bg: "bg-violet-50",
    hint: "Total daily energy intake",
  },
  {
    key: "protein_g" as const,
    label: "Protein",
    unit: "g",
    color: "text-blue-600",
    bg: "bg-blue-50",
    hint: "~0.8–1.2g per lb of bodyweight",
  },
  {
    key: "carb_g" as const,
    label: "Carbohydrates",
    unit: "g",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    hint: "Primary energy source",
  },
  {
    key: "fat_g" as const,
    label: "Fat",
    unit: "g",
    color: "text-amber-600",
    bg: "bg-amber-50",
    hint: "Healthy fats for hormones",
  },
] as const;

type GoalKey = (typeof GOAL_FIELDS)[number]["key"];

export default function NutritionGoalsSheet({
  open,
  goals,
  onClose,
  onSaved,
}: {
  open: boolean;
  goals: MacroGoals;
  onClose: () => void;
  onSaved: (goals: MacroGoals) => void;
}) {
  const [form, setForm] = useState<Record<GoalKey, string>>({
    calories: "",
    protein_g: "",
    carb_g: "",
    fat_g: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        calories: String(goals.calories),
        protein_g: String(goals.protein_g),
        carb_g: String(goals.carb_g),
        fat_g: String(goals.fat_g),
      });
      setError("");
      setSaved(false);
    }
  }, [open, goals]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setError("");
    const updated: MacroGoals = {
      calories: parseFloat(form.calories),
      protein_g: parseFloat(form.protein_g),
      carb_g: parseFloat(form.carb_g),
      fat_g: parseFloat(form.fat_g),
    };
    if (Object.values(updated).some(isNaN)) {
      setError("All fields must be valid numbers");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/nutrition/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      onSaved(updated);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 800);
    } else {
      setError("Failed to save goals");
    }
    setSaving(false);
  }

  const totalCals =
    (parseFloat(form.protein_g) || 0) * 4 +
    (parseFloat(form.carb_g) || 0) * 4 +
    (parseFloat(form.fat_g) || 0) * 9;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close goals"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-goals-title"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-100 bg-white shadow-xl md:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="nutrition-goals-title"
              className="text-lg font-bold text-slate-900"
            >
              Daily goals
            </h2>
            <p className="text-xs text-slate-400">Macro targets for tracking</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {GOAL_FIELDS.map(({ key, label, unit, color, bg, hint }) => (
            <div key={key} className={`${bg} rounded-2xl p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>
                </div>
                <span className="text-xs tabular-nums text-slate-400">
                  {goals[key]} {unit}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, [key]: e.target.value }));
                    setError("");
                  }}
                  className="w-full rounded-xl bg-white/70 py-2.5 pl-4 pr-12 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  {unit}
                </span>
              </div>
            </div>
          ))}

          {totalCals > 0 && (
            <p className="text-[10px] text-slate-500">
              Macro-implied calories:{" "}
              <span className="font-semibold tabular-nums text-slate-700">
                {Math.round(totalCals)} kcal
              </span>
            </p>
          )}

          {error && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-all disabled:opacity-60 ${saved
                ? "bg-emerald-500 shadow-emerald-200"
                : "bg-blue-600 shadow-sm shadow-blue-200 hover:bg-blue-700"
              }`}
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save goals"}
          </button>
        </div>
      </div>
    </div>
  );
}
