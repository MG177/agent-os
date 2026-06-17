import path from "path";

/** Default model for the Claude Agent SDK provider. */
export const DEFAULT_CLAUDE_MODEL_ID = "claude-sonnet-4-6";

export interface ClaudeAgentSdkConfig {
  modelId: string;
  cwd: string;
  mcpServerScript: string;
}

function resolveMcpServerScript(): string {
  return path.join(process.cwd(), "scripts", "assistant-mcp-server.ts");
}

export function loadClaudeAgentSdkConfig(): ClaudeAgentSdkConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (Anthropic Console).",
    );
  }

  return {
    modelId: process.env.CLAUDE_ASSISTANT_MODEL?.trim() || DEFAULT_CLAUDE_MODEL_ID,
    cwd: process.env.CLAUDE_AGENT_CWD?.trim() || process.cwd(),
    mcpServerScript: resolveMcpServerScript(),
  };
}
