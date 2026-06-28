"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@agent-os/contracts/utils";

const STYLES = {
  blue: "border-primary/30 bg-accent text-primary hover:bg-accent hover:border-primary/30",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300",
  violet:
    "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:border-violet-300",
} as const;

export function QuickActionChip({
  href,
  onClick,
  label,
  icon,
  variant,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  variant: keyof typeof STYLES;
}) {
  const className = cn(
    buttonVariants({ variant: "outline", size: "default" }),
    "min-h-11 gap-2 rounded-full border px-4 font-semibold shadow-sm",
    STYLES[variant],
  );
  const content = (
    <>
      <span className="flex size-6 items-center justify-center rounded-full bg-white/80 text-sm">
        {icon}
      </span>
      {label}
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
