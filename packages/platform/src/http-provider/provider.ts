import { loadHttpProviderConfig } from "@agent-os/platform/http-provider/config";
import type {
  AssistantProvider,
  AssistantProviderOutcome,
  AssistantProviderSendOptions,
} from "@agent-os/contracts/assistant/provider";

/**
 * Generic OpenAI-compatible chat-completions endpoint. No MCP/tool-calling
 * support — intended as a lightweight fallback/experimentation path (e.g.
 * pointing at a local Ollama server), not the primary daily driver.
 */
export const httpAssistantProvider: AssistantProvider = {
  id: "http",

  async send(
    options: AssistantProviderSendOptions,
  ): Promise<AssistantProviderOutcome> {
    let config;
    try {
      config = loadHttpProviderConfig();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load HTTP provider config";
      return { ok: false, error: { kind: "startup", message, isRetryable: false, status: 503 } };
    }

    if (options.image) {
      console.warn("[http-provider] image input is not supported, dropping it");
    }

    let response: Response;
    try {
      response = await fetch(config.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          ...(config.model ? { model: config.model } : {}),
          messages: [
            { role: "system", content: options.systemInstruction },
            { role: "user", content: options.userPrompt },
          ],
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "HTTP request failed";
      return { ok: false, error: { kind: "startup", message, isRetryable: true, status: 503 } };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: {
          kind: "startup",
          message: `Assistant HTTP endpoint returned ${response.status}`,
          isRetryable: false,
          status: response.status,
        },
      };
    }

    let text: string | undefined;
    try {
      const data = await response.json();
      text = data?.choices?.[0]?.message?.content;
    } catch {
      // fall through to error below
    }

    if (typeof text !== "string") {
      return {
        ok: false,
        error: {
          kind: "run",
          message: "Assistant HTTP endpoint returned an unexpected response shape",
          isRetryable: false,
          status: 500,
        },
      };
    }

    return { ok: true, text };
  },
};
