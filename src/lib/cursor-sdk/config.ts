import path from "path";

/** Default Cursor model for Agent OS assistants. */
export const DEFAULT_CURSOR_MODEL_ID = "composer-2.5";

export interface CursorSdkConfig {
  apiKey: string;
  modelId: string;
  cwd: string;
  mcpServerScript: string;
}

function resolveMcpServerScript(): string {
  return path.join(process.cwd(), "scripts", "assistant-mcp-server.ts");
}

export function loadCursorSdkConfig(): CursorSdkConfig {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "CURSOR_API_KEY is not set. Add it to .env.local (Cursor Dashboard → Integrations).",
    );
  }

  const modelId =
    process.env.CURSOR_ASSISTANT_MODEL?.trim() || DEFAULT_CURSOR_MODEL_ID;

  const cwd = process.env.CURSOR_AGENT_CWD?.trim() || process.cwd();

  return {
    apiKey,
    modelId,
    cwd,
    mcpServerScript: resolveMcpServerScript(),
  };
}

export function buildAgentOsMcpServers(
  config: Pick<CursorSdkConfig, "mcpServerScript" | "cwd">,
  policyEnv?: Record<string, string>,
): Record<
  string,
  {
    type?: "stdio";
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
  }
> {
  return {
    "agent-os": {
      type: "stdio",
      command: "npx",
      args: ["tsx", "--tsconfig", "tsconfig.json", config.mcpServerScript],
      cwd: config.cwd,
      env: {
        ...process.env,
        VAULT_PATH: process.env.VAULT_PATH,
        MONGODB_URI: process.env.MONGODB_URI,
        TZ: process.env.TZ,
        GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
        ...policyEnv,
      } as Record<string, string>,
    },
  };
}
