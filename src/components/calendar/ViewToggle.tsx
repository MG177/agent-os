"use client";

export type CalendarViewMode = "agenda" | "timeline";

export function ViewToggle({
  value,
  onChange,
}: {
  value: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label="Calendar view"
    >
      {(
        [
          { id: "agenda" as const, label: "Agenda" },
          { id: "timeline" as const, label: "Timeline" },
        ] as const
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === id
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
