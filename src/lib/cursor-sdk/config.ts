import path from "path";

/** Default Cursor model for Agent OS assistants. */
export const DEFAULT_CURSOR_MODEL_ID = "composer-2.5";

export interface CursorSdkConfig {
  apiKey: string;
  modelId: string;
  /**
   * Cursor agent project root. Its `.cursor/{rules,skills}` load as the PROJECT
   * setting scope. Set CURSOR_AGENT_CWD to the PARA vault to load vault rules/skills.
   * NOTE: this is the agent's project root, NOT the MCP child's working dir — the
   * MCP child always runs from the app root (see buildAgentOsMcpServers).
   */
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

  // Agent project root (drives PROJECT-scope rules/skills). On the VPS this is the
  // PARA vault via CURSOR_AGENT_CWD; falls back to the app root in local dev.
  const cwd = process.env.CURSOR_AGENT_CWD?.trim() || process.cwd();

  return {
    apiKey,
    modelId,
    cwd,
    mcpServerScript: resolveMcpServerScript(),
  };
}

export function buildAgentOsMcpServers(
  config: Pick<CursorSdkConfig, "mcpServerScript">,
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
  // The MCP child must run from the APP root (where tsconfig.json, scripts/ and
  // node_modules live), independent of the agent's project cwd (which may be the
  // PARA vault). Derive it from the script path: <appRoot>/scripts/<file>. Using an
  // absolute --tsconfig means the child no longer depends on its working directory.
  const appRoot = path.dirname(path.dirname(config.mcpServerScript));

  return {
    "agent-os": {
      type: "stdio",
      command: "npx",
      args: [
        "tsx",
        "--tsconfig",
        path.join(appRoot, "tsconfig.json"),
        config.mcpServerScript,
      ],
      cwd: appRoot,
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
