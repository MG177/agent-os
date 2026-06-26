import { isGoogleOAuthConfigured } from "@agent-os/platform/integrations/google-calendar/config";
import {
  isCalendarConnected,
  loadTokenRecord,
} from "@agent-os/platform/integrations/google-calendar/store";
import type { GoogleCalendarStatus } from "@agent-os/contracts/integrations/google-calendar/types";

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
