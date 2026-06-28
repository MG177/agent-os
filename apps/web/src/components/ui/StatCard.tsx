// Flat categorical tints (not brand). One soft fill per metric — no
// gradient, no decorative dot. The value color carries the category.
const VARIANTS = {
  blue: {
    card: "border-primary/30 bg-accent/50",
    value: "text-primary",
    label: "text-primary/80",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/50",
    value: "text-emerald-700",
    label: "text-emerald-600/80",
  },
  violet: {
    card: "border-violet-100 bg-violet-50/50",
    value: "text-violet-700",
    label: "text-violet-600/80",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/50",
    value: "text-amber-700",
    label: "text-amber-600/80",
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
      <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${v.label}`}>
        {label}
      </p>
      <p className={`text-xl font-bold leading-tight tabular-nums ${v.value}`}>
        {value}
      </p>
    </div>
  );
}
