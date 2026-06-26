/** Provider-agnostic contract for the assistant's underlying agent runtime. */

export type AssistantProviderErrorKind = "startup" | "run";

export interface AssistantProviderError {
  kind: AssistantProviderErrorKind;
  message: string;
  isRetryable: boolean;
  status?: number;
  code?: string;
}

export interface AssistantProviderSendOptions {
  systemInstruction: string;
  userPrompt: string;
  image?: { base64: string; mediaType: string };
  /** Per-request MCP/tool routing policy env (from commandPolicyToMcpEnv). */
  mcpPolicyEnv: Record<string, string>;
}

export type AssistantProviderOutcome =
  | { ok: true; text: string }
  | { ok: false; error: AssistantProviderError };

export interface AssistantProvider {
  readonly id: "cursor" | "claude" | "http";
  send(options: AssistantProviderSendOptions): Promise<AssistantProviderOutcome>;
}
