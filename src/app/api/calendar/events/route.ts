import { NextRequest } from "next/server";
import {
  CalendarNotConnectedError,
  listCalendarEvents,
} from "@/lib/integrations/google-calendar/client";
import { isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar/config";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return Response.json(
      { error: "Google Calendar integration is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const refresh = searchParams.get("refresh") === "1";

  try {
    const events = await listCalendarEvents(request, {
      range,
      from,
      to,
      skipCache: refresh,
    });
    return Response.json({ events });
  } catch (err) {
    if (err instanceof CalendarNotConnectedError) {
      return Response.json(
        { error: "not_connected", message: err.message },
        { status: 401 },
      );
    }
    const message = err instanceof Error ? err.message : "Failed to load events";
    return Response.json({ error: message }, { status: 500 });
  }
}
