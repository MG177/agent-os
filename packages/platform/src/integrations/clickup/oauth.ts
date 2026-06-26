import { getClickUpOAuthClientConfig } from "@agent-os/platform/integrations/clickup/config";
import { fetchClickUpIdentity } from "@agent-os/platform/integrations/clickup/client";

const AUTHORIZE_URL = "https://app.clickup.com/api";
const API_BASE = "https://api.clickup.com/api/v2";

export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const { clientId } = getClickUpOAuthClientConfig();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Exchange the auth code for a long-lived access token, then resolve the
 * connected user and their default (first) workspace. ClickUp OAuth tokens do
 * not expire and have no refresh token, so this runs once at connect time.
 */
export async function exchangeAuthorizationCode(code: string): Promise<{
  accessToken: string;
  userId: number;
  username?: string;
  teamId: string;
  teamName?: string;
}> {
  const { clientId, clientSecret } = getClickUpOAuthClientConfig();

  const tokenUrl = new URL(`${API_BASE}/oauth/token`);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl, { method: "POST" });
  if (!tokenRes.ok) {
    throw new Error(`ClickUp token exchange failed (${tokenRes.status})`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    throw new Error("ClickUp did not return an access token");
  }

  const identity = await fetchClickUpIdentity(accessToken);
  return { accessToken, ...identity };
}
