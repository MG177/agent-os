import { getAssistantProvider } from "@/lib/assistant/provider-factory";
import {
  buildAssistantSystemInstruction,
  buildUserPromptPayload,
} from "@/lib/assistant/prompt";
import type {
  AssistantChatRequest,
  AssistantChatMessage,
} from "@/lib/assistant/types";
import {
  commandPolicyToMcpEnv,
  normalizeCommandId,
  parseSlashCommandFromText,
  resolveCommandPolicy,
} from "@/lib/assistant/commands";

export interface RunAssistantChatResult {
  ok: true;
  text: string;
}

export interface RunAssistantChatError {
  ok: false;
  message: string;
  status: number;
}

export type RunAssistantChatOutcome =
  | RunAssistantChatResult
  | RunAssistantChatError;

function validateMessages(
  messages: AssistantChatMessage[],
): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages array is required";
  }
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") {
      return "invalid message role";
    }
    if (typeof m.content !== "string") {
      return "invalid message content";
    }
  }
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return "last message must be from user";
  }
  return null;
}

/** Resolve command from explicit field or leading `/command` in last user message. */
function resolveRequestCommand(
  request: AssistantChatRequest,
): { policy: ReturnType<typeof resolveCommandPolicy>; messages: AssistantChatMessage[] } {
  const msgs = [...request.messages];
  const lastIdx = msgs.length - 1;
  const last = msgs[lastIdx];

  let commandId = request.command
    ? normalizeCommandId(request.command)
    : null;

  if (!commandId || commandId === "general") {
    const parsed = parseSlashCommandFromText(last.content);
    if (parsed.commandId) {
      commandId = parsed.commandId;
      if (parsed.body !== last.content.trim()) {
        msgs[lastIdx] = { ...last, content: parsed.body || last.content };
      }
    }
  }

  const policy = resolveCommandPolicy(commandId ?? "general");
  return { policy, messages: msgs };
}

export async function runAssistantChat(
  request: AssistantChatRequest,
): Promise<RunAssistantChatOutcome> {
  const validationError = validateMessages(request.messages);
  if (validationError) {
    return { ok: false, message: validationError, status: 400 };
  }

  const { policy, messages } = resolveRequestCommand(request);
  const mcpPolicyEnv = commandPolicyToMcpEnv(policy);

  const systemInstruction = await buildAssistantSystemInstruction(policy);
  const userText = buildUserPromptPayload(
    messages,
    request.image
      ? "An image is attached — use it for nutrition labels or food identification."
      : undefined,
  );

  const provider = getAssistantProvider();
  const outcome = await provider.send({
    systemInstruction,
    userPrompt: userText,
    image: request.image,
    mcpPolicyEnv,
  });

  if (!outcome.ok) {
    console.error("[assistant]", outcome.error);
    return {
      ok: false,
      message:
        outcome.error.kind === "startup"
          ? outcome.error.message
          : "Assistant run failed. Check server logs.",
      status: outcome.error.status ?? (outcome.error.kind === "startup" ? 503 : 500),
    };
  }

  const text = outcome.text || "Done — let me know if you need anything else.";

  return { ok: true, text };
}
