#!/usr/bin/env npx tsx
/**
 * MCP stdio entrypoint for Cursor SDK agents.
 * Spawned by src/lib/cursor-sdk/config.ts → buildAgentOsMcpServers().
 */
import { startAssistantMcpServer } from "@agent-os/platform/assistant/mcp/server";

startAssistantMcpServer().catch((err) => {
  console.error("assistant-mcp-server failed:", err);
  process.exit(1);
});
