"use client";

import Link from "next/link";

const STYLES = {
  blue: {
    card: "border-primary/30 bg-white/95 hover:border-primary/30 hover:bg-accent/50",
    icon: "bg-accent text-primary",
  },
  emerald: {
    card: "border-emerald-100 bg-white/95 hover:border-emerald-200 hover:bg-emerald-50/50",
    icon: "bg-emerald-100 text-emerald-600",
  },
  violet: {
    card: "border-violet-100 bg-white/95 hover:border-violet-200 hover:bg-violet-50/50",
    icon: "bg-violet-100 text-violet-600",
  },
} as const;

export function QuickActionCard({
  href,
  onClick,
  title,
  description,
  icon,
  variant,
  layout = "row",
}: {
  href?: string;
  onClick?: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant: keyof typeof STYLES;
  layout?: "row" | "grid";
}) {
  const s = STYLES[variant];

  const className =
    layout === "grid"
      ? `group flex h-full min-h-[4.5rem] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 ${s.card}`
      : `flex w-full items-start gap-4 rounded-3xl border p-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 ${s.card}`;

  const content =
    layout === "grid" ? (
      <>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm ${s.icon}`}
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
      </>
    ) : (
      <>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${s.icon}`}
        >
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </>
    );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
