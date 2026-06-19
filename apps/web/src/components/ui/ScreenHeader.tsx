import Link from "next/link";
import { IconBack } from "./icons";

export function ScreenHeader({
  title,
  trailing,
  backHref,
}: {
  title: string;
  trailing?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50"
            aria-label="Go back"
          >
            <IconBack />
          </Link>
        )}
        <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">{title}</h1>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </header>
  );
}
