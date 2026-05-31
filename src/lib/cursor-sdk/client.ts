import { Agent, type SDKAgent } from "@cursor/sdk";
import {
  buildAgentOsMcpServers,
  loadCursorSdkConfig,
  type CursorSdkConfig,
} from "@/lib/cursor-sdk/config";

export interface CreateCursorAgentOptions {
  config?: CursorSdkConfig;
  name?: string;
  /** Per-request MCP env (slash-command tool scope). */
  mcpPolicyEnv?: Record<string, string>;
}

/**
 * Create a local Cursor agent wired to Agent OS MCP tools.
 * Caller must dispose via `closeCursorAgent` or `using agent`.
 */
export async function createCursorAgent(
  options: CreateCursorAgentOptions = {},
): Promise<SDKAgent> {
  const config = options.config ?? loadCursorSdkConfig();

  const agent = await Agent.create({
    apiKey: config.apiKey,
    name: options.name ?? "agent-os-assistant",
    model: { id: config.modelId },
    local: {
      cwd: config.cwd,
      settingSources: [],
    },
    mcpServers: buildAgentOsMcpServers(config, options.mcpPolicyEnv),
  });

  return agent;
}

export async function closeCursorAgent(agent: SDKAgent): Promise<void> {
  await agent[Symbol.asyncDispose]();
}
