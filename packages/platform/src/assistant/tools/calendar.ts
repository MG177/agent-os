import { z } from "zod";
import {
  listCalendarEvents,
  CalendarNotConnectedError,
} from "@agent-os/platform/integrations/google-calendar/client";
import { createAssistantOAuthRequest } from "@agent-os/platform/assistant/request-context";
import type { AssistantToolDefinition } from "@agent-os/contracts/assistant/types";

const rangeSchema = z.object({
  range: z
    .enum(["today", "week", "14days"])
    .optional()
    .describe("Preset range; default today for get_today_schedule"),
});

const listEventsSchema = z.object({
  range: z.enum(["today", "week", "14days"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

async function listEventsSafe(
  options: z.infer<typeof listEventsSchema>,
): Promise<unknown> {
  try {
    const request = createAssistantOAuthRequest();
    const events = await listCalendarEvents(request, {
      range: options.range ?? "week",
      from: options.from ?? null,
      to: options.to ?? null,
    });
    return {
      connected: true,
      count: events.length,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        calendarName: e.calendarName,
        location: e.location,
      })),
    };
  } catch (err) {
    if (err instanceof CalendarNotConnectedError) {
      return {
        connected: false,
        error: "Google Calendar is not connected. Connect in Settings → Integrations.",
        events: [],
      };
    }
    throw err;
  }
}

export const calendarTools: AssistantToolDefinition[] = [
  {
    name: "get_today_schedule",
    description: "Get today's calendar events (read-only).",
    module: "calendar",
    boundary: "read-only",
    transport: "local",
    zodSchema: rangeSchema,
    inputSchema: {
      type: "object",
      properties: {
        range: {
          type: "string",
          enum: ["today", "week", "14days"],
          description: "Ignored — always uses today",
        },
      },
    },
    execute: async () => {
      const request = createAssistantOAuthRequest();
      try {
        const events = await listCalendarEvents(request, { range: "today" });
        return {
          connected: true,
          count: events.length,
          events: events.map((e) => ({
            title: e.title,
            start: e.start,
            end: e.end,
            allDay: e.allDay,
            location: e.location,
          })),
        };
      } catch (err) {
        if (err instanceof CalendarNotConnectedError) {
          return {
            connected: false,
            error: "Google Calendar is not connected.",
            events: [],
          };
        }
        throw err;
      }
    },
  },
  {
    name: "list_events",
    description:
      "List calendar events for a range (read-only). Presets: today, week, 14days; or from/to ISO dates.",
    module: "calendar",
    boundary: "read-only",
    transport: "local",
    zodSchema: listEventsSchema,
    inputSchema: {
      type: "object",
      properties: {
        range: { type: "string", enum: ["today", "week", "14days"] },
        from: { type: "string", description: "ISO start (with custom range)" },
        to: { type: "string", description: "ISO end (with custom range)" },
      },
    },
    execute: (args) => listEventsSafe(listEventsSchema.parse(args)),
  },
];
