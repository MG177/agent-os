import type {
  AssistantToolDefinition,
  AssistantToolCallResult,
  ToolBoundary,
  AssistantModule,
} from "@/lib/assistant/types";
import { allAssistantTools } from "@/lib/assistant/tools";
import {
  getRuntimeToolPolicyFromEnv,
  isToolAllowed,
  toolNotAllowedMessage,
} from "@/lib/assistant/tool-policy";

const toolMap = new Map<string, AssistantToolDefinition>(
  allAssistantTools.map((t) => [t.name, t]),
);

export function getAssistantTool(name: string): AssistantToolDefinition | undefined {
  return toolMap.get(name);
}

export function listAssistantTools(): AssistantToolDefinition[] {
  return [...allAssistantTools];
}

/** Tools exposed on MCP for the current request (hard-route filters registration). */
export function listAssistantToolsForMcp(): AssistantToolDefinition[] {
  const policy = getRuntimeToolPolicyFromEnv();
  if (policy.routing === "hard" && policy.allowedTools) {
    return allAssistantTools.filter((t) => policy.allowedTools!.has(t.name));
  }
  return [...allAssistantTools];
}

export function listToolsByBoundary(
  boundary: ToolBoundary,
): AssistantToolDefinition[] {
  return allAssistantTools.filter((t) => t.boundary === boundary);
}

export function listToolsByModule(
  module: AssistantModule,
): AssistantToolDefinition[] {
  return allAssistantTools.filter((t) => t.module === module);
}

export async function executeAssistantTool(
  name: string,
  args: Record<string, unknown>,
): Promise<AssistantToolCallResult> {
  const tool = getAssistantTool(name);
  if (!tool) {
    return { name, result: null, error: `Unknown tool: ${name}` };
  }

  const policy = getRuntimeToolPolicyFromEnv();
  if (!isToolAllowed(name, policy)) {
    return {
      name,
      result: null,
      error: toolNotAllowedMessage(name, policy),
    };
  }

  try {
    const parsed = tool.zodSchema
      ? tool.zodSchema.parse(args)
      : args;
    const result = await tool.execute(parsed as Record<string, unknown>);
    return { name, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, result: null, error: message };
  }
}

/** MCP-ready export: tool name → JSON Schema input */
export function toolSchemasForMcp(): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  return allAssistantTools.map((t) => ({
    name: t.name,
    description: `[${t.module}/${t.boundary}] ${t.description}`,
    inputSchema: t.inputSchema,
  }));
}
