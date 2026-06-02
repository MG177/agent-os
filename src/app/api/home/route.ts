import { listInbox } from "@/lib/vault";
import {
  readLog,
  readGoals,
  calculateTotals,
  todayISO,
  type MacroGoals,
} from "@/lib/nutrition";
import { buildActivityFeed, countCapturesToday } from "@/lib/activity";

const DEFAULT_GOALS: MacroGoals = { calories: 2200, protein_g: 160, carb_g: 220, fat_g: 73 };

export async function GET() {
  const date = todayISO();

  const [entries, goals, recentActivity] = await Promise.all([
    readLog(date).catch(() => []),
    readGoals().catch(() => DEFAULT_GOALS),
    buildActivityFeed(8).catch(() => []),
  ]);

  const totals = calculateTotals(entries);

  return Response.json({
    status: "online",
    capturesToday: countCapturesToday(),
    mealsToday: totals.meal_count,
    totals,
    goals,
    recentActivity,
    inboxCount: listInbox().length,
  });
}
