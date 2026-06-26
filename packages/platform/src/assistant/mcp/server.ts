import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  executeAssistantTool,
  listAssistantToolsForMcp,
} from "@agent-os/platform/assistant/tool-registry";

/**
 * Stdio MCP server exposing Agent OS assistant tools for Cursor SDK agents.
 */
export async function startAssistantMcpServer(): Promise<void> {
  const server = new McpServer(
    { name: "agent-os-assistant", version: "1.0.0" },
    {
      instructions:
        "Agent OS tools: nutrition, vault (Inbox write-only), calendar (read-only), activity.",
    },
  );

  for (const tool of listAssistantToolsForMcp()) {
    const shape =
      tool.zodSchema && tool.zodSchema instanceof z.ZodObject
        ? (tool.zodSchema as z.ZodObject<z.ZodRawShape>).shape
        : undefined;

    if (shape) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: shape,
        },
        async (args) => {
          const outcome = await executeAssistantTool(
            tool.name,
            args as Record<string, unknown>,
          );
          const text = outcome.error
            ? JSON.stringify({ error: outcome.error })
            : JSON.stringify(outcome.result);
          return {
            content: [{ type: "text" as const, text }],
          };
        },
      );
    } else {
      server.tool(
        tool.name,
        tool.description,
        async () => {
          const outcome = await executeAssistantTool(tool.name, {});
          const text = outcome.error
            ? JSON.stringify({ error: outcome.error })
            : JSON.stringify(outcome.result);
          return {
            content: [{ type: "text" as const, text }],
          };
        },
      );
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
