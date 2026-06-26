import type { SDKUserMessage } from "@cursor/sdk";
import { createCursorAgent, closeCursorAgent, sendAndCollectText } from "@agent-os/platform/cursor-sdk";
import type {
  AssistantProvider,
  AssistantProviderOutcome,
  AssistantProviderSendOptions,
} from "@agent-os/contracts/assistant/provider";

export const cursorProvider: AssistantProvider = {
  id: "cursor",

  async send(
    options: AssistantProviderSendOptions,
  ): Promise<AssistantProviderOutcome> {
    let agent;
    try {
      agent = await createCursorAgent({
        name: "agent-os-chat",
        mcpPolicyEnv: options.mcpPolicyEnv,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initialize Cursor agent";
      return {
        ok: false,
        error: {
          kind: "startup",
          message,
          isRetryable: false,
          status: message.includes("CURSOR_API_KEY") ? 503 : 500,
        },
      };
    }

    try {
      const fullPrompt = `${options.systemInstruction}\n\n---\n\n${options.userPrompt}`;
      const message: SDKUserMessage = {
        text: fullPrompt,
        ...(options.image
          ? {
              images: [
                { data: options.image.base64, mimeType: options.image.mediaType },
              ],
            }
          : {}),
      };

      const outcome = await sendAndCollectText({ agent, message });

      if (!outcome.ok) {
        return {
          ok: false,
          error: {
            ...outcome.error,
            status:
              outcome.error.status ??
              (outcome.error.kind === "startup" ? 503 : 500),
          },
        };
      }

      return { ok: true, text: outcome.text };
    } finally {
      await closeCursorAgent(agent);
    }
  },
};
