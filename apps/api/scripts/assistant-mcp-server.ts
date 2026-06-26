#!/usr/bin/env npx tsx
/**
 * MCP stdio entrypoint spawned by the assistant runtime (Cursor / Claude SDK)
 * from the NestJS api. Mirrors apps/web/scripts/assistant-mcp-server.ts.
 */
import { startAssistantMcpServer } from "@agent-os/platform/assistant/mcp/server";

startAssistantMcpServer().catch((err) => {
  console.error("assistant-mcp-server failed:", err);
  process.exit(1);
});
