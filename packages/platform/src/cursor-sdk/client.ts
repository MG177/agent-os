import { Agent, type SDKAgent } from "@cursor/sdk";
import {
  buildAgentOsMcpServers,
  loadCursorSdkConfig,
  type CursorSdkConfig,
} from "@agent-os/platform/cursor-sdk/config";

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
      // Agent project root = the PARA vault (CURSOR_AGENT_CWD) → loads
      // ${vault}/.cursor/{rules,skills} as the PROJECT setting scope.
      cwd: config.cwd,
      // Load both ambient setting layers: "user" = $HOME/.cursor/{rules,skills}
      // (container HOME=/root, mounted from ~/.cursor); "project" = cwd/.cursor.
      // Valid values: "project" | "user" | "team" | "mdm" | "plugins" | "all"
      // (@cursor/sdk options.d.ts); "all" cannot be mixed with explicit entries.
      settingSources: ["user", "project"],
    },
    mcpServers: buildAgentOsMcpServers(config, options.mcpPolicyEnv),
  });

  return agent;
}

export async function closeCursorAgent(agent: SDKAgent): Promise<void> {
  await agent[Symbol.asyncDispose]();
}
