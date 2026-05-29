import { listInbox } from "@/lib/vault";
import {
  readLog,
  readGoals,
  calculateTotals,
  todayISO,
} from "@/lib/nutrition";
import { buildActivityFeed, countCapturesToday } from "@/lib/activity";

export async function GET() {
  const date = todayISO();
  const entries = await readLog(date);
  const totals = calculateTotals(entries);
  const goals = await readGoals();

  return Response.json({
    status: "online",
    capturesToday: countCapturesToday(),
    mealsToday: totals.meal_count,
    totals,
    goals,
    recentActivity: await buildActivityFeed(8),
    inboxCount: listInbox().length,
  });
}
