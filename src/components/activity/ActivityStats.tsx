import type { ActivityStatsData } from "./activity-display";

function StatTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "blue";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-600"
      : tone === "blue"
        ? "text-blue-600"
        : "text-slate-900";
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
      <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

export function ActivityStats({
  title,
  stats,
}: {
  title: string;
  stats: ActivityStatsData;
}) {
  const maxSource = Math.max(1, ...stats.bySource.map((s) => s.count));

  return (
    <aside className="lg:sticky lg:top-6">
      <div className="app-card space-y-5">
        <div>
          <p className="app-section-label">{title}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
            {stats.total}
          </p>
          <p className="text-xs text-slate-400">
            {stats.total === 1 ? "event" : "events"}
            {stats.today > 0 && (
              <>
                {" · "}
                <span className="text-slate-500">{stats.today} today</span>
              </>
            )}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <StatTile label="Captures" value={stats.captures} />
          <StatTile label="Meals" value={stats.meals} />
          <StatTile label="Reverted" value={stats.reverted} tone="amber" />
          <StatTile label="Undoable" value={stats.undoable} tone="blue" />
        </dl>

        {stats.bySource.length > 0 && (
          <div className="hidden space-y-2 lg:block">
            <p className="app-section-label">By source</p>
            <ul className="space-y-1.5">
              {stats.bySource.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate text-slate-500">
                    {s.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full rounded-full ${s.barClass}`}
                      style={{ width: `${(s.count / maxSource) * 100}%` }}
                    />
                  </span>
                  <span className="w-5 text-right tabular-nums text-slate-400">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
