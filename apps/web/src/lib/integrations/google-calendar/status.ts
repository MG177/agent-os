import { isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar/config";
import {
  isCalendarConnected,
  loadTokenRecord,
} from "@/lib/integrations/google-calendar/store";
import type { GoogleCalendarStatus } from "@/lib/integrations/google-calendar/types";

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const configured = isGoogleOAuthConfigured();
  if (!configured) {
    return { connected: false, configured: false };
  }

  try {
    const [connected, record] = await Promise.all([
      isCalendarConnected(),
      loadTokenRecord(),
    ]);
    return {
      connected,
      configured: true,
      email: record?.email,
      connectedAt: record?.connectedAt,
    };
  } catch {
    // Env is set but token storage (MongoDB) is unavailable — still "configured".
    return { connected: false, configured: true };
  }
}
