import {
  isClickUpOAuthConfigured,
  isClickUpReady,
} from "@/lib/integrations/clickup/config";
import {
  isClickUpConnected,
  loadTokenRecord,
} from "@/lib/integrations/clickup/store";
import type { ClickUpStatus } from "@/lib/integrations/clickup/types";

export async function getClickUpStatus(): Promise<ClickUpStatus> {
  const configured = isClickUpReady();
  const [connected, record] = await Promise.all([
    configured ? isClickUpConnected() : Promise.resolve(false),
    loadTokenRecord(),
  ]);

  return {
    connected,
    configured,
    oauthConfigured: isClickUpOAuthConfigured(),
    username: record?.username,
    teamName: record?.teamName,
    connectedAt: record?.connectedAt,
  };
}
