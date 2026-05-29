import { buildActivityFeed } from "@/lib/activity";

export async function GET() {
  return Response.json({ events: await buildActivityFeed(100) });
}
