import { buildActivityFeed } from "@/lib/activity";
import {
  proxyToFullEnabled,
  proxyToFullInstance,
} from "@/lib/full-instance-proxy";

export async function GET(request: Request) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request);
  return Response.json({ events: await buildActivityFeed(100) });
}
