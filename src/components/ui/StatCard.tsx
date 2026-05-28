const VARIANTS = {
  blue: {
    card: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
    value: "text-blue-700",
    label: "text-blue-600/80",
    dot: "bg-blue-500",
  },
  emerald: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
    value: "text-emerald-700",
    label: "text-emerald-600/80",
    dot: "bg-emerald-500",
  },
  violet: {
    card: "border-violet-100 bg-gradient-to-br from-violet-50 to-white",
    value: "text-violet-700",
    label: "text-violet-600/80",
    dot: "bg-violet-500",
  },
  amber: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
    value: "text-amber-700",
    label: "text-amber-600/80",
    dot: "bg-amber-500",
  },
} as const;

export function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string | number;
  variant: keyof typeof VARIANTS;
}) {
  const v = VARIANTS[variant];
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 shadow-sm ${v.card}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} aria-hidden />
        <p className={`text-[10px] font-bold uppercase tracking-wide ${v.label}`}>
          {label}
        </p>
      </div>
      <p className={`text-xl font-bold leading-tight tabular-nums ${v.value}`}>
        {value}
      </p>
    </div>
  );
}
