import { google } from "googleapis";
import {
  getCalendarReadonlyScope,
  getGoogleOAuthClientConfig,
} from "@agent-os/platform/integrations/google-calendar/config";

export function createOAuth2Client(redirectUri: string) {
  const { clientId, clientSecret } = getGoogleOAuthClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const client = createOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [getCalendarReadonlyScope()],
    state,
  });
}

export async function exchangeAuthorizationCode(
  redirectUri: string,
  code: string,
): Promise<{ refreshToken: string; email?: string }> {
  const client = createOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token; revoke app access and reconnect with consent",
    );
  }

  client.setCredentials(tokens);
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    email = data.email ?? undefined;
  } catch {
    // optional
  }

  return { refreshToken: tokens.refresh_token, email };
}

export function getAuthenticatedClient(
  redirectUri: string,
  refreshToken: string,
) {
  const client = createOAuth2Client(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}
