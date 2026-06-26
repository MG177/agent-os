import { listInbox } from "@agent-os/platform/vault";
import {
  readLog,
  readGoals,
  calculateTotals,
  todayISO,
  type MacroGoals,
} from "@agent-os/platform/nutrition";
import { buildActivityFeed, countCapturesToday } from "@agent-os/platform/activity";

const DEFAULT_GOALS: MacroGoals = { calories: 2200, protein_g: 160, carb_g: 220, fat_g: 73 };

export async function GET() {
  const date = todayISO();

  const [entries, goals, recentActivity] = await Promise.all([
    readLog(date).catch(() => []),
    readGoals().catch(() => DEFAULT_GOALS),
    buildActivityFeed(8).catch(() => []),
  ]);

  const totals = calculateTotals(entries);

  // Short private cache — stale-while-revalidate lets the browser serve
  // the last response instantly on revisit while SWR revalidates in background.
  return Response.json(
    {
      status: "online",
      capturesToday: countCapturesToday(),
      mealsToday: totals.meal_count,
      totals,
      goals,
      recentActivity,
      inboxCount: listInbox().length,
    },
    {
      headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=60" },
    },
  );
}
