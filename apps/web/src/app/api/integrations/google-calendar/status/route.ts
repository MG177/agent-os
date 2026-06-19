import { getGoogleCalendarStatus } from "@agent-os/platform/integrations/google-calendar/status";

export async function GET() {
  return Response.json(await getGoogleCalendarStatus());
}
