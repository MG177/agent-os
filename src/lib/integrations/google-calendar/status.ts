import { isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar/config";
import {
  isCalendarConnected,
  loadTokenRecord,
} from "@/lib/integrations/google-calendar/store";
import type { GoogleCalendarStatus } from "@/lib/integrations/google-calendar/types";

export function getGoogleCalendarStatus(): GoogleCalendarStatus {
  const configured = isGoogleOAuthConfigured();
  const connected = configured && isCalendarConnected();
  const record = loadTokenRecord();

  return {
    connected,
    configured,
    email: record?.email,
    connectedAt: record?.connectedAt,
  };
}
