import type { Run, RunResult, SDKMessage, SDKUserMessage } from "@cursor/sdk";
import { CursorAgentError } from "@cursor/sdk";
import {
  normalizeRunError,
  normalizeStartupError,
  type NormalizedCursorError,
} from "@/lib/cursor-sdk/errors";
import type { SDKAgent } from "@cursor/sdk";

export interface SendAndWaitOptions {
  agent: SDKAgent;
  message: string | SDKUserMessage;
  logIds?: boolean;
}

export interface SendAndWaitSuccess {
  ok: true;
  run: Run;
  result: RunResult;
  text: string;
}

export interface SendAndWaitFailure {
  ok: false;
  error: NormalizedCursorError;
  runId?: string;
  agentId?: string;
}

export type SendAndWaitOutcome = SendAndWaitSuccess | SendAndWaitFailure;

/**
 * Collect assistant prose from streamed SDK messages.
 * Chunks are usually cumulative snapshots or token deltas — not separate paragraphs.
 */
function extractAssistantText(messages: SDKMessage[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.type !== "assistant") continue;
    for (const block of msg.message.content) {
      if (block.type === "text" && block.text.trim()) {
        parts.push(block.text);
      }
    }
  }
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.trim();

  const last = parts[parts.length - 1]!;
  const first = parts[0]!.trim();
  // Cumulative stream: final chunk contains the full reply.
  if (
    last.startsWith(first) ||
    last.length >= parts.reduce((sum, p) => sum + p.length, 0) * 0.6
  ) {
    return last.trim();
  }
  // Token deltas: stitch in order (never insert blank lines between chunks).
  return parts.join("").trim();
}

/**
 * Send a prompt, stream to collect assistant text, then wait for terminal result.
 */
export async function sendAndCollectText(
  options: SendAndWaitOptions,
): Promise<SendAndWaitOutcome> {
  const { agent, message, logIds = true } = options;

  let run: Run;
  try {
    run = await agent.send(message);
  } catch (err) {
    return { ok: false, error: normalizeStartupError(err) };
  }

  if (logIds) {
    console.info(
      `[cursor-sdk] agentId=${agent.agentId} runId=${run.id} status=${run.status}`,
    );
  }

  const streamed: SDKMessage[] = [];
  try {
    for await (const event of run.stream()) {
      streamed.push(event);
    }
    const result = await run.wait();

    if (result.status === "error" || result.status === "cancelled") {
      return {
        ok: false,
        error: normalizeRunError(run.id, result.status),
        runId: run.id,
        agentId: agent.agentId,
      };
    }

    const fromStream = extractAssistantText(streamed);
    const fromResult =
      typeof result.result === "string" ? result.result.trim() : "";
    const text = fromResult || fromStream;

    return { ok: true, run, result, text };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        error: normalizeStartupError(err),
        runId: run.id,
        agentId: agent.agentId,
      };
    }
    throw err;
  }
}
