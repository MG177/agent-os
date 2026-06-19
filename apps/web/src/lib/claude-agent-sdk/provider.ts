import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { buildAgentOsMcpServers } from "@/lib/cursor-sdk/config";
import { loadClaudeAgentSdkConfig } from "@/lib/claude-agent-sdk/config";
import {
  normalizeAssistantMessageError,
  normalizeResultError,
  normalizeStartupError,
} from "@/lib/claude-agent-sdk/errors";
import type {
  AssistantProvider,
  AssistantProviderOutcome,
  AssistantProviderSendOptions,
} from "@/lib/assistant/provider";

async function* singleImagePrompt(
  text: string,
  image: { base64: string; mediaType: string },
): AsyncIterable<SDKUserMessage> {
  yield {
    type: "user",
    parent_tool_use_id: null,
    message: {
      role: "user",
      content: [
        { type: "text", text },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: image.base64,
          },
        },
      ],
    },
  };
}

export const claudeAgentProvider: AssistantProvider = {
  id: "claude",

  async send(
    options: AssistantProviderSendOptions,
  ): Promise<AssistantProviderOutcome> {
    let config;
    try {
      config = loadClaudeAgentSdkConfig();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load Claude Agent SDK config";
      return {
        ok: false,
        error: {
          kind: "startup",
          message,
          isRetryable: false,
          status: message.includes("ANTHROPIC_API_KEY") ? 503 : 500,
        },
      };
    }

    const mcpServers = buildAgentOsMcpServers(config, options.mcpPolicyEnv);
    const prompt = options.image
      ? singleImagePrompt(options.userPrompt, options.image)
      : options.userPrompt;

    const handle = query({
      prompt,
      options: {
        systemPrompt: options.systemInstruction,
        mcpServers,
        cwd: config.cwd,
        model: config.modelId,
      },
    });

    try {
      let text = "";
      for await (const message of handle) {
        if (message.type === "assistant" && message.error) {
          return { ok: false, error: normalizeAssistantMessageError(message.error) };
        }
        if (message.type === "result") {
          if (message.subtype === "success") {
            text = message.result;
          } else {
            return { ok: false, error: normalizeResultError(message) };
          }
        }
      }
      return { ok: true, text };
    } catch (err) {
      return { ok: false, error: normalizeStartupError(err) };
    } finally {
      handle.close();
    }
  },
};
