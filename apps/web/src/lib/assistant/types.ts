import type { z } from "zod";
import type { AssistantSlashCommandId } from "@/lib/assistant/commands";

/** Domain module identifier for tool grouping and future MCP migration. */
export type AssistantModule =
  | "nutrition"
  | "vault"
  | "calendar"
  | "activity"
  | "core";

/** Data boundary enforced at execution time (not prompt-only). */
export type ToolBoundary = "read" | "write" | "read-only";

export type ToolTransport = "local" | "mcp";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatImage {
  base64: string;
  mediaType: string;
}

export interface AssistantChatRequest {
  messages: AssistantChatMessage[];
  image?: AssistantChatImage;
  /** Slash command scope (e.g. log-nutrition, capture). Omit or general = all tools. */
  command?: AssistantSlashCommandId | string | null;
}

/** JSON Schema shape for MCP / model tool declarations. */
export type ToolInputSchema = Record<string, unknown>;

export interface AssistantToolDefinition<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  module: AssistantModule;
  boundary: ToolBoundary;
  transport: ToolTransport;
  inputSchema: ToolInputSchema;
  /** Zod schema used by MCP server for validation when present. */
  zodSchema?: z.ZodType<TArgs>;
  execute: (args: TArgs) => Promise<unknown>;
}

export interface AssistantToolCallResult {
  name: string;
  result: unknown;
  error?: string;
}
