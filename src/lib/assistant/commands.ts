/**
 * Slash command catalog and routing policy (hybrid: hard write scope, soft read scope).
 * Safe to import from client components (no server-only deps).
 */

export type AssistantSlashCommandId =
  | "general"
  | "log-nutrition"
  | "nutrition-summary"
  | "capture"
  | "inbox"
  | "list-events"
  | "vault-search"
  | "recent-activity";

export type CommandRoutingMode = "none" | "hard" | "soft";

export interface SlashCommandDefinition {
  id: AssistantSlashCommandId;
  /** Includes leading slash */
  slash: string;
  label: string;
  description: string;
  routing: CommandRoutingMode;
  /** Hard-route: only these tools are registered and executable */
  allowedTools: string[] | null;
  /** Soft-route: highlighted in prompt; all tools remain available */
  preferredTools: string[];
  promptHint: string;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    id: "log-nutrition",
    slash: "/log-nutrition",
    label: "Log nutrition",
    description: "Log meals, search foods, update food DB",
    routing: "hard",
    allowedTools: [
      "log_food",
      "search_food_db",
      "add_food_to_db",
      "get_daily_summary",
    ],
    preferredTools: [
      "log_food",
      "search_food_db",
      "add_food_to_db",
      "get_daily_summary",
    ],
    promptHint:
      "Focus on logging food and nutrition. Use log_food when the user mentions eating or drinking.",
  },
  {
    id: "nutrition-summary",
    slash: "/nutrition-summary",
    label: "Nutrition summary",
    description: "Today's macros and goals",
    routing: "soft",
    allowedTools: null,
    preferredTools: ["get_daily_summary", "search_food_db"],
    promptHint:
      "Answer with today's nutrition totals vs goals. Prefer get_daily_summary.",
  },
  {
    id: "capture",
    slash: "/capture",
    label: "Capture",
    description: "Save a note to Obsidian Inbox only",
    routing: "hard",
    allowedTools: ["capture_note"],
    preferredTools: ["capture_note"],
    promptHint:
      "Capture the user's note to Inbox via capture_note only. Confirm slug/title briefly.",
  },
  {
    id: "inbox",
    slash: "/inbox",
    label: "Inbox",
    description: "List or read Inbox items",
    routing: "soft",
    allowedTools: null,
    preferredTools: ["list_inbox", "read_inbox_item"],
    promptHint: "Help triage Inbox. Prefer list_inbox and read_inbox_item.",
  },
  {
    id: "list-events",
    slash: "/list-events",
    label: "List events",
    description: "Today's or ranged calendar (read-only)",
    routing: "soft",
    allowedTools: null,
    preferredTools: ["get_today_schedule", "list_events"],
    promptHint:
      "Answer schedule questions with get_today_schedule or list_events. Calendar is read-only.",
  },
  {
    id: "vault-search",
    slash: "/vault-search",
    label: "Vault search",
    description: "Search and read vault notes (read-only)",
    routing: "soft",
    allowedTools: null,
    preferredTools: ["search_vault", "read_note"],
    promptHint:
      "Search the vault with search_vault, then read_note for details. No writes outside Inbox.",
  },
  {
    id: "recent-activity",
    slash: "/recent-activity",
    label: "Recent activity",
    description: "Audit feed: captures, meals, reverts",
    routing: "soft",
    allowedTools: null,
    preferredTools: ["recent_activity"],
    promptHint: "Summarize recent_activity results for the user.",
  },
  {
    id: "general",
    slash: "/general",
    label: "General",
    description: "All modules — default assistant mode",
    routing: "none",
    allowedTools: null,
    preferredTools: [],
    promptHint: "",
  },
];

const commandById = new Map(
  SLASH_COMMANDS.map((c) => [c.id, c]),
);

const commandBySlash = new Map(
  SLASH_COMMANDS.map((c) => [c.slash.toLowerCase(), c]),
);

export interface CommandPolicy {
  id: AssistantSlashCommandId;
  routing: CommandRoutingMode;
  allowedTools: Set<string> | null;
  preferredTools: string[];
  promptHint: string;
  label: string;
}

export function resolveCommandPolicy(
  commandId?: string | null,
): CommandPolicy {
  const id = normalizeCommandId(commandId);
  const def = commandById.get(id) ?? commandById.get("general")!;
  return {
    id: def.id,
    routing: def.routing,
    allowedTools: def.allowedTools ? new Set(def.allowedTools) : null,
    preferredTools: def.preferredTools,
    promptHint: def.promptHint,
    label: def.label,
  };
}

export function normalizeCommandId(
  raw?: string | null,
): AssistantSlashCommandId {
  if (!raw || raw === "general") return "general";
  const trimmed = raw.replace(/^\//, "").toLowerCase();
  if (commandById.has(trimmed as AssistantSlashCommandId)) {
    return trimmed as AssistantSlashCommandId;
  }
  return "general";
}

export function getSlashCommandDefinition(
  id: AssistantSlashCommandId,
): SlashCommandDefinition {
  return commandById.get(id) ?? commandById.get("general")!;
}

/** Filter commands for autocomplete (query after `/`). */
export function filterSlashCommands(query: string): SlashCommandDefinition[] {
  const q = query.toLowerCase().replace(/^\//, "");
  if (!q) return SLASH_COMMANDS.filter((c) => c.id !== "general");
  return SLASH_COMMANDS.filter(
    (c) =>
      c.id !== "general" &&
      (c.slash.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        c.id.includes(q)),
  );
}

/**
 * Parse leading `/command` from message text (e.g. `/capture Buy milk`).
 */
export function parseSlashCommandFromText(text: string): {
  commandId: AssistantSlashCommandId | null;
  body: string;
} {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-z0-9-]+)(?:\s+([\s\S]*))?$/i);
  if (!match) return { commandId: null, body: trimmed };

  const slash = `/${match[1].toLowerCase()}`;
  const def = commandBySlash.get(slash);
  if (!def || def.id === "general") {
    return { commandId: null, body: trimmed };
  }

  return {
    commandId: def.id,
    body: (match[2] ?? "").trim(),
  };
}

/** Env passed to MCP child process for tool scoping. */
export function commandPolicyToMcpEnv(
  policy: CommandPolicy,
): Record<string, string> {
  const env: Record<string, string> = {
    ASSISTANT_COMMAND_ID: policy.id,
    ASSISTANT_ROUTING_MODE: policy.routing,
  };
  if (policy.allowedTools) {
    env.ASSISTANT_ALLOWED_TOOLS = [...policy.allowedTools].join(",");
  } else {
    delete env.ASSISTANT_ALLOWED_TOOLS;
  }
  if (policy.preferredTools.length > 0) {
    env.ASSISTANT_PREFERRED_TOOLS = policy.preferredTools.join(",");
  }
  return env;
}
