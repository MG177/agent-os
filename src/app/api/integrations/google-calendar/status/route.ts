import { getGoogleCalendarStatus } from "@/lib/integrations/google-calendar/status";

export async function GET() {
  return Response.json(getGoogleCalendarStatus());
}
