import {
  readLog,
  readGoals,
  calculateTotals,
  todayISO,
} from "@/lib/nutrition";
import { listInbox } from "@/lib/vault";
import { countCapturesToday } from "@/lib/activity";
import {
  listCalendarEvents,
  CalendarNotConnectedError,
} from "@/lib/integrations/google-calendar/client";
import { createAssistantOAuthRequest } from "@/lib/assistant/request-context";
import type { AssistantChatMessage } from "@/lib/assistant/types";
import type { CommandPolicy } from "@/lib/assistant/commands";
import { listAssistantTools } from "@/lib/assistant/tool-registry";

async function buildContextBlock(): Promise<string> {
  const date = todayISO();
  const entries = await readLog(date);
  const totals = calculateTotals(entries);
  const goals = await readGoals();
  const inboxCount = listInbox().length;
  const capturesToday = countCapturesToday();

  let calendarLine = "Calendar: not connected";
  try {
    const request = createAssistantOAuthRequest();
    const events = await listCalendarEvents(request, { range: "today" });
    calendarLine = `Calendar today: ${events.length} event(s)`;
    if (events.length > 0) {
      const preview = events
        .slice(0, 5)
        .map((e) => `  - ${e.start.slice(11, 16) || "all-day"} ${e.title}`)
        .join("\n");
      calendarLine += `\n${preview}`;
    }
  } catch (err) {
    if (!(err instanceof CalendarNotConnectedError)) {
      calendarLine = "Calendar: unavailable";
    }
  }

  return `Today: ${date}
Nutrition consumed: ${totals.calories} kcal · ${totals.protein_g}g protein · ${totals.meal_count} meals
Goals: ${goals.calories} kcal · ${goals.protein_g}g protein
Inbox: ${inboxCount} item(s) · ${capturesToday} capture(s) today
${calendarLine}`;
}

function formatToolInventory(policy: CommandPolicy): string {
  let tools = listAssistantTools();
  if (policy.routing === "hard" && policy.allowedTools) {
    tools = tools.filter((t) => policy.allowedTools!.has(t.name));
  } else if (policy.routing === "soft" && policy.preferredTools.length > 0) {
    const preferred = new Set(policy.preferredTools);
    const pref = tools.filter((t) => preferred.has(t.name));
    const rest = tools.filter((t) => !preferred.has(t.name));
    tools = [...pref, ...rest];
  }

  const byModule = new Map<string, string[]>();
  for (const t of tools) {
    const star =
      policy.preferredTools.includes(t.name) && policy.routing === "soft"
        ? " *"
        : "";
    const line = `- ${t.name}${star} (${t.boundary}): ${t.description}`;
    const list = byModule.get(t.module) ?? [];
    list.push(line);
    byModule.set(t.module, list);
  }
  const sections: string[] = [];
  for (const [mod, lines] of byModule) {
    sections.push(`### ${mod}\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}

function formatCommandSection(policy: CommandPolicy): string {
  if (policy.id === "general" || policy.routing === "none") {
    return "";
  }
  const scopeLine =
    policy.routing === "hard"
      ? `**Hard scope** — only these tools are available: ${policy.allowedTools ? [...policy.allowedTools].join(", ") : "none"}.`
      : `**Soft scope** — prefer: ${policy.preferredTools.join(", ")}. Other read tools remain available if needed.`;

  return `## Active command: /${policy.id} (${policy.label})
${scopeLine}
${policy.promptHint}
`;
}

export async function buildAssistantSystemInstruction(
  policy: CommandPolicy,
): Promise<string> {
  const context = await buildContextBlock();
  const tools = formatToolInventory(policy);
  const commandSection = formatCommandSection(policy);

  return `You are the Agent OS personal assistant — one interface across nutrition, Obsidian vault, and calendar.

## Current context
${context}

${commandSection}## Boundaries (hard rules)
- Vault writes: ONLY via capture_note → Inbox/. Never modify Projects/, Areas/, Resources/, or Ideas/ directly.
- Vault reads: search_vault and read_note are allowed (read-only).
- Calendar: read-only — never create or edit events.
- Nutrition: log meals via log_food; always confirm what was logged briefly.
- Use MCP tools for all data actions — do not guess numbers or invent vault paths.

## Tool inventory
${tools}
${policy.routing === "soft" && policy.preferredTools.length > 0 ? "\n(* = preferred for this command)\n" : ""}

## Behavior
- Be concise and friendly.
- When the user mentions food/drink, call log_food immediately (provide nutrition_per_100g from labels or reasonable estimates).
- For label photos: read values and log with nutrition_per_100g.
- For captures/notes/tasks: use capture_note.
- For schedule questions: use get_today_schedule or list_events.
- For vault knowledge: search_vault then read_note as needed.
- After tool calls, summarize outcomes in one or two short lines.`;
}

export function formatConversationForPrompt(
  messages: AssistantChatMessage[],
): string {
  if (messages.length === 0) return "";

  return messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `${role}: ${m.content}`.trim();
    })
    .join("\n\n");
}

export function buildUserPromptPayload(
  messages: AssistantChatMessage[],
  imageNote?: string,
): string {
  const history = formatConversationForPrompt(messages.slice(0, -1));
  const last = messages[messages.length - 1];
  const parts: string[] = [];

  if (history) {
    parts.push("## Conversation so far\n" + history);
  }

  parts.push("## Latest user message\n" + (last?.content || "(see attached image)"));

  if (imageNote) {
    parts.push(imageNote);
  }

  parts.push(
    "\nRespond to the latest message. Use tools when needed, then reply in plain language.",
  );

  return parts.join("\n\n");
}
