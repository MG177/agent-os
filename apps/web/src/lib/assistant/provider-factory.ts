import { cursorProvider } from "@/lib/cursor-sdk/provider";
import { claudeAgentProvider } from "@/lib/claude-agent-sdk/provider";
import { httpAssistantProvider } from "@/lib/http-provider/provider";
import type { AssistantProvider } from "@/lib/assistant/provider";

export type AssistantProviderId = "cursor" | "claude" | "http";

/** Selects the assistant agent runtime via ASSISTANT_PROVIDER (default: cursor). */
export function getAssistantProvider(): AssistantProvider {
  const id = (process.env.ASSISTANT_PROVIDER?.trim() ||
    "cursor") as AssistantProviderId;

  switch (id) {
    case "cursor":
      return cursorProvider;
    case "claude":
      return claudeAgentProvider;
    case "http":
      return httpAssistantProvider;
    default:
      throw new Error(`Unknown ASSISTANT_PROVIDER: ${id}`);
  }
}
