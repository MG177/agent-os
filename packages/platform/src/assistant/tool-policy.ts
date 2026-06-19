import type { CommandRoutingMode } from "@agent-os/contracts/assistant/commands";

export interface RuntimeToolPolicy {
  commandId: string;
  routing: CommandRoutingMode;
  allowedTools: Set<string> | null;
  preferredTools: string[];
}

function parseToolList(envValue: string | undefined): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Read policy from MCP process env (set per chat request). */
export function getRuntimeToolPolicyFromEnv(): RuntimeToolPolicy {
  const routing = (process.env.ASSISTANT_ROUTING_MODE ??
    "none") as CommandRoutingMode;
  const allowedRaw = process.env.ASSISTANT_ALLOWED_TOOLS;
  const allowedTools =
    routing === "hard" && allowedRaw
      ? new Set(parseToolList(allowedRaw))
      : null;

  return {
    commandId: process.env.ASSISTANT_COMMAND_ID ?? "general",
    routing,
    allowedTools,
    preferredTools: parseToolList(process.env.ASSISTANT_PREFERRED_TOOLS),
  };
}

export function isToolAllowed(
  toolName: string,
  policy: RuntimeToolPolicy,
): boolean {
  if (policy.routing !== "hard" || !policy.allowedTools) {
    return true;
  }
  return policy.allowedTools.has(toolName);
}

export function toolNotAllowedMessage(
  toolName: string,
  policy: RuntimeToolPolicy,
): string {
  const allowed = policy.allowedTools
    ? [...policy.allowedTools].join(", ")
    : "all";
  return `Tool "${toolName}" is not allowed in /${policy.commandId} mode (hard scope). Allowed: ${allowed}.`;
}
