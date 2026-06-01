import { isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar/config";
import {
  isCalendarConnected,
  loadTokenRecord,
} from "@/lib/integrations/google-calendar/store";
import type { GoogleCalendarStatus } from "@/lib/integrations/google-calendar/types";

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const configured = isGoogleOAuthConfigured();
  const [connected, record] = await Promise.all([
    configured ? isCalendarConnected() : Promise.resolve(false),
    loadTokenRecord(),
  ]);

  return {
    connected,
    configured,
    email: record?.email,
    connectedAt: record?.connectedAt,
  };
}
