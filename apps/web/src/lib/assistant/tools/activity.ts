import { z } from "zod";
import { buildActivityFeed } from "@/lib/activity";
import type { AssistantToolDefinition } from "@/lib/assistant/types";

const recentSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export const activityTools: AssistantToolDefinition[] = [
  {
    name: "recent_activity",
    description:
      "Read recent activity feed (captures, meals, reverts) from the audit log.",
    module: "activity",
    boundary: "read-only",
    transport: "local",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max events (default 20, max 50)",
        },
      },
    },
    zodSchema: recentSchema,
    execute: async (args) => {
      const { limit = 20 } = recentSchema.parse(args);
      const events = await buildActivityFeed(limit);
      return {
        count: events.length,
        events: events.map((e) => ({
          kind: e.kind,
          text: e.text,
          timestamp: e.timestamp,
          undoable: e.undoable,
        })),
      };
    },
  },
];
