import {
  isClickUpOAuthConfigured,
  isClickUpReady,
} from "@agent-os/platform/integrations/clickup/config";
import {
  isClickUpConnected,
  loadTokenRecord,
} from "@agent-os/platform/integrations/clickup/store";
import type { ClickUpStatus } from "@agent-os/contracts/integrations/clickup/types";

export async function getClickUpStatus(): Promise<ClickUpStatus> {
  const configured = isClickUpReady();
  if (!configured) {
    return {
      connected: false,
      configured: false,
      oauthConfigured: false,
    };
  }

  try {
    const [connected, record] = await Promise.all([
      isClickUpConnected(),
      loadTokenRecord(),
    ]);
    return {
      connected,
      configured: true,
      oauthConfigured: isClickUpOAuthConfigured(),
      username: record?.username,
      teamName: record?.teamName,
      connectedAt: record?.connectedAt,
    };
  } catch {
    return {
      connected: false,
      configured: true,
      oauthConfigured: isClickUpOAuthConfigured(),
    };
  }
}
