"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Broccoli, Pencil, Plus } from "lucide-react";
import SearchField from "@/components/ui/SearchField";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { FoodEntry } from "../types";

const MACRO_FIELDS = [
  { field: "calories" as const, label: "Calories", unit: "kcal", required: true },
  { field: "protein_g" as const, label: "Protein", unit: "g", required: true },
  { field: "carb_g" as const, label: "Carbs", unit: "g", required: true },
  { field: "fat_g" as const, label: "Fat", unit: "g", required: true },
  { field: "fiber_g" as const, label: "Fiber", unit: "g", required: false },
  { field: "sugar_g" as const, label: "Sugar", unit: "g", required: false },
];

type FormField = (typeof MACRO_FIELDS)[number]["field"];
type FormState = { name: string } & Record<FormField, string>;

function foodToForm(food: FoodEntry): FormState {
  const { per_100g } = food;
  return {
    name: food.display_name,
    calories: String(per_100g.calories),
    protein_g: String(per_100g.protein_g),
    carb_g: String(per_100g.carb_g),
    fat_g: String(per_100g.fat_g),
    fiber_g: per_100g.fiber_g != null ? String(per_100g.fiber_g) : "",
    sugar_g: per_100g.sugar_g != null ? String(per_100g.sugar_g) : "",
  };
}

/** Memoized library row (the main `<tr>`). The mobile portion-entry expander
 *  lives in the parent so changing the portion only re-renders that one row,
 *  not the whole table. */
const FoodRow = memo(function FoodRow({
  food,
  active,
  onRowClick,
  onEdit,
}: {
  food: FoodEntry;
  active: boolean;
  onRowClick: (e: React.MouseEvent<HTMLTableRowElement>, food: FoodEntry) => void;
  onEdit: (food: FoodEntry) => void;
}) {
  return (
    <tr
      onClick={(e) => onRowClick(e, food)}
      className={`cursor-pointer transition-colors ${
        active ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
    >
      <td className="px-4 py-3 font-medium text-slate-800">
        {food.display_name}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-blue-600">
        {food.per_100g.protein_g}g
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-emerald-600">
        {food.per_100g.carb_g}g
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-amber-600">
        {food.per_100g.fat_g}g
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-violet-600">
        {food.per_100g.calories}
      </td>
      <td className="px-2 py-3 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(food);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
          aria-label={`Edit ${food.display_name}`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      </td>
    </tr>
  );
});

const EMPTY_FORM: FormState = {
  name: "",
  calories: "",
  protein_g: "",
  carb_g: "",
  fat_g: "",
  fiber_g: "",
  sugar_g: "",
};


/**
 * Unified food panel: search the library, tap a food to log it with an inline
 * portion, and manage definitions (the list doubles as the library + an Add
 * food form). Replaces the separate Log / Library tabs.
 */
export default function FoodWorkspace({
  logDate,
  onLogged,
}: {
  /** Date to log meals against (YYYY-MM-DD). */
  logDate: string;
  onLogged: () => void;
}) {
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [frequency, setFrequency] = useState<{ food_name: string; count: number; last_logged: string }[]>([]);
  const [sort, setSort] = useState<"most-logged" | "latest" | "az">("most-logged");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Desktop popover
  const [popoverFood, setPopoverFood] = useState<FoodEntry | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Mirror of popoverFood so the row click handler can stay referentially stable
  // (keeps FoodRow's React.memo effective).
  const popoverFoodRef = useRef<FoodEntry | null>(null);
  useEffect(() => {
    popoverFoodRef.current = popoverFood;
  }, [popoverFood]);

  useEffect(() => {
    if (!popoverFood) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverFood(null);
        setPopoverPos(null);
      }
    }
    function onScroll() {
      setPopoverFood(null);
      setPopoverPos(null);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [popoverFood]);

  const loadFoods = useCallback(() => {
    fetch("/api/nutrition/foods")
      .then((r) => r.json())
      .then((d) => setFoods(d.foods || []))
      .catch(() => {});
  }, []);

  const loadFrequency = useCallback(() => {
    fetch("/api/nutrition/log?alltime=true")
      .then((r) => r.json())
      .then((d) => setFrequency(d.frequency || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadFoods();
    loadFrequency();
  }, [loadFoods, loadFrequency]);

  useEffect(() => {
    const onUpdate = () => loadFrequency();
    window.addEventListener("nutrition:updated", onUpdate);
    return () => window.removeEventListener("nutrition:updated", onUpdate);
  }, [loadFrequency]);

  // Debounce the query that drives filtering — the input stays responsive while
  // the O(n) filter + table re-render only runs once the user pauses typing.
  const debouncedQuery = useDebouncedValue(query, 200);
  const q = debouncedQuery.trim().toLowerCase();

  const exactMatch = useMemo(
    () => foods.some((f) => f.display_name.toLowerCase() === q),
    [foods, q],
  );

  const filtered = useMemo(() => {
    const base = q
      ? foods.filter((f) => f.display_name.toLowerCase().includes(q) || f.key.includes(q))
      : [...foods];

    if (q) return base; // keep search results in relevance order

    if (sort === "most-logged" || sort === "latest") {
      const freqMap = new Map(
        frequency.map((r) => [r.food_name.toLowerCase(), r]),
      );
      return base.sort((a, b) => {
        const ra = freqMap.get(a.display_name.toLowerCase());
        const rb = freqMap.get(b.display_name.toLowerCase());
        if (sort === "most-logged") {
          return (rb?.count ?? 0) - (ra?.count ?? 0);
        }
        // latest: foods never logged sink to bottom
        if (!ra && !rb) return 0;
        if (!ra) return 1;
        if (!rb) return -1;
        return ra.last_logged > rb.last_logged ? -1 : 1;
      });
    }

    // az
    return base.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [foods, q, sort, frequency]);

  const selectFood = useCallback((key: string) => {
    setLogError("");
    setSelectedKey((prev) => (prev === key ? null : key));
    setQuantity(100);
  }, []);

  const selected = filtered.find((f) => f.key === selectedKey) ?? null;
  const preview =
    selected && quantity > 0
      ? Math.round(((selected.per_100g.calories * quantity) / 100) * 10) / 10
      : 0;
  const popoverPreview =
    popoverFood && quantity > 0
      ? Math.round(((popoverFood.per_100g.calories * quantity) / 100) * 10) / 10
      : 0;

  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, food: FoodEntry) => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) {
      if (popoverFoodRef.current?.key === food.key) {
        setPopoverFood(null);
        setPopoverPos(null);
        setSelectedKey(null);
      } else {
        const POPUP_W = 256;
        const rect = e.currentTarget.getBoundingClientRect();
        let x = e.clientX;
        const y = rect.bottom + 6;
        if (x + POPUP_W > window.innerWidth - 12) x = window.innerWidth - POPUP_W - 12;
        setPopoverFood(food);
        setPopoverPos({ x, y });
        setSelectedKey(food.key);
        setQuantity(100);
        setLogError("");
      }
    } else {
      selectFood(food.key);
    }
    },
    [selectFood],
  );

  async function logMeal(food: FoodEntry) {
    if (!quantity) {
      setLogError("Enter a portion");
      return;
    }
    setLogging(true);
    setLogError("");
    const res = await fetch("/api/nutrition/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        food_name: food.display_name,
        quantity_grams: quantity,
        date: logDate,
      }),
    });
    if (res.ok) {
      setSelectedKey(null);
      setPopoverFood(null);
      setPopoverPos(null);
      setQuantity(100);
      onLogged();
    } else {
      const d = await res.json().catch(() => ({}));
      setLogError(d.error || "Failed to log");
    }
    setLogging(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openAddForm(prefillName = "") {
    setEditingKey(null);
    setForm({ ...EMPTY_FORM, name: prefillName });
    setFormError("");
    setSelectedKey(null);
    setPopoverFood(null);
    setPopoverPos(null);
    setShowForm(true);
  }

  const openEditForm = useCallback((food: FoodEntry) => {
    setEditingKey(food.key);
    setForm(foodToForm(food));
    setFormError("");
    setSelectedKey(null);
    setPopoverFood(null);
    setPopoverPos(null);
    setShowForm(true);
  }, []);

  async function handleSaveFood() {
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Food name is required");
      return;
    }
    for (const { field, label, required } of MACRO_FIELDS) {
      if (required && (!form[field] || isNaN(parseFloat(form[field])))) {
        setFormError(`${label} is required`);
        return;
      }
    }
    const per_100g: Record<string, number> = {};
    for (const { field } of MACRO_FIELDS) {
      const val = parseFloat(form[field]);
      if (!isNaN(val)) per_100g[field] = val;
    }

    setSaving(true);
    const url = editingKey
      ? `/api/nutrition/foods/${encodeURIComponent(editingKey)}`
      : "/api/nutrition/foods";
    const res = await fetch(url, {
      method: editingKey ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ food_name: form.name.trim(), per_100g }),
    });
    if (res.ok) {
      closeForm();
      loadFoods();
    } else {
      const d = await res.json().catch(() => ({}));
      setFormError(d.error || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4 md:min-h-0 md:flex-1">
      <SearchField
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedKey(null);
        }}
        onClear={() => setQuery("")}
        placeholder="Search food library…"
        aria-label="Search food library"
      />

      {/* Library header + sort + add toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="app-section-label">
            {foods.length} {foods.length === 1 ? "food" : "foods"}
          </p>
          {!q && (
            <div className="flex items-center rounded-xl border border-slate-100 bg-white p-0.5 shadow-sm">
              {(["most-logged", "latest", "az"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    sort === s
                      ? "bg-slate-900 text-white"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {s === "most-logged" ? "Most logged" : s === "latest" ? "Latest" : "A–Z"}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => (showForm && !editingKey ? closeForm() : openAddForm())}
          disabled={showForm && !!editingKey}
          className={`flex items-center gap-1.5 rounded-2xl px-3 py-3 text-xs font-semibold shadow-sm transition-colors ${
            showForm && !editingKey
              ? "bg-slate-100 text-slate-600"
              : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          {!(showForm && !editingKey) && (
            <Plus strokeWidth={2} className="h-3.5 w-3.5" aria-hidden />
          )}
          {showForm && !editingKey ? "Cancel" : "Add food"}
        </button>
      </div>

      {/* Add food form */}
      {showForm && (
        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="app-section-label">
              {editingKey ? "Edit food (per 100g)" : "New food (per 100g)"}
            </p>
            {editingKey && (
              <button
                type="button"
                onClick={closeForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
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
                  {!required && <span className="ml-1 text-slate-300">optional</span>}
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [field]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-xl bg-slate-50 px-3 py-3.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          {formError && (
            <p className="text-xs font-medium text-red-600" role="alert">
              {formError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSaveFood}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingKey ? "Save changes" : "Save food"}
          </button>
        </div>
      )}

      {/* Food list — tap to log; doubles as the library */}
      <div className="px-1 py-1 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="app-card flex flex-col items-center py-12 text-center">
            <Broccoli strokeWidth={1.6} className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-600">
              {q ? `No food matches "${query}"` : "No foods yet"}
            </p>
            {q && !exactMatch && (
              <button
                type="button"
                onClick={() => openAddForm(query.trim())}
                className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add &quot;{query.trim()}&quot; to your library
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Food
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-blue-400">P</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-400">C</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-amber-400">F</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    kcal
                  </th>
                  <th className="w-10 px-2 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((food) => {
                  const active = selectedKey === food.key;
                  return (
                    <Fragment key={food.key}>
                      <FoodRow
                        food={food}
                        active={active}
                        onRowClick={handleRowClick}
                        onEdit={openEditForm}
                      />

                      {active && (
                        <tr className="bg-blue-50/60 md:hidden">
                          <td colSpan={6} className="border-t border-blue-100 px-3 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setQuantity((v) => Math.max(0, v - 25))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-white"
                                aria-label="Decrease portion"
                              >
                                −
                              </button>
                              <div className="flex items-baseline gap-0.5">
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
                                  className="w-12 bg-transparent text-center text-sm font-bold tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <span className="text-xs font-semibold text-slate-500">g</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setQuantity((v) => v + 25)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-white"
                                aria-label="Increase portion"
                              >
                                +
                              </button>
                              {preview > 0 && (
                                <span className="text-xs text-slate-500">≈ {preview} kcal</span>
                              )}
                              {logError && (
                                <span className="text-xs text-red-500">{logError}</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(food);
                                }}
                                className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <Pencil className="h-3 w-3" strokeWidth={1.8} aria-hidden />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => logMeal(food)}
                                disabled={logging}
                                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 disabled:opacity-60"
                              >
                                {logging ? "Logging…" : "Log"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Desktop popover — appears at click position */}
      {popoverFood && popoverPos && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
          style={{ left: popoverPos.x, top: popoverPos.y }}
        >
          <p className="mb-2 truncate text-xs font-semibold text-slate-700">
            {popoverFood.display_name}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuantity((v) => Math.max(0, v - 25))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-slate-100"
              aria-label="Decrease portion"
            >
              −
            </button>
            <div className="flex items-baseline gap-0.5">
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
                autoFocus
                className="w-12 rounded-lg bg-slate-50 px-1 py-1 text-center text-sm font-bold tabular-nums text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-xs font-semibold text-slate-500">g</span>
            </div>
            <button
              type="button"
              onClick={() => setQuantity((v) => v + 25)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-slate-100"
              aria-label="Increase portion"
            >
              +
            </button>
            {popoverPreview > 0 && (
              <span className="text-xs text-slate-400">≈ {popoverPreview} kcal</span>
            )}
          </div>
          {logError && (
            <p className="mt-1 text-xs text-red-500" role="alert">{logError}</p>
          )}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                openEditForm(popoverFood);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              Edit
            </button>
            <button
              type="button"
              onClick={() => logMeal(popoverFood)}
              disabled={logging}
              className="flex-[2] rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {logging ? "Logging…" : "Log meal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
