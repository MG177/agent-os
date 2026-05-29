import Link from "next/link";

const STYLES = {
  blue: {
    card: "border-blue-100 bg-white/95 hover:border-blue-200 hover:bg-blue-50/50",
    icon: "bg-blue-100 text-blue-600",
  },
  emerald: {
    card: "border-emerald-100 bg-white/95 hover:border-emerald-200 hover:bg-emerald-50/50",
    icon: "bg-emerald-100 text-emerald-600",
  },
  violet: {
    card: "border-violet-100 bg-white/95 hover:border-violet-200 hover:bg-violet-50/50",
    icon: "bg-violet-100 text-violet-600",
  },
  indigo: {
    card: "border-indigo-100 bg-white/95 hover:border-indigo-200 hover:bg-indigo-50/50",
    icon: "bg-indigo-100 text-indigo-600",
  },
} as const;

export function QuickActionCard({
  href,
  title,
  description,
  icon,
  variant,
  layout = "row",
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  variant: keyof typeof STYLES;
  layout?: "row" | "grid";
}) {
  const s = STYLES[variant];

  if (layout === "grid") {
    return (
      <Link
        href={href}
        className={`group flex h-full min-h-[4.5rem] items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 ${s.card}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${s.icon}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight text-slate-800 transition-colors group-hover:text-slate-900">
            {title}
          </p>
          <p className="mt-0.5 text-xs leading-tight text-slate-500">
            {description}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-start gap-4 rounded-3xl border p-4 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 ${s.card}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${s.icon}`}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
