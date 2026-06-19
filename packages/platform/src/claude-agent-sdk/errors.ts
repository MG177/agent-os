import type { SDKAssistantMessageError, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AssistantProviderError } from "@agent-os/contracts/assistant/provider";

const AUTH_ERRORS: SDKAssistantMessageError[] = [
  "authentication_failed",
  "oauth_org_not_allowed",
  "billing_error",
];

/** Thrown before/while the Claude CLI subprocess runs (spawn failure, network, abort). */
export function normalizeStartupError(err: unknown): AssistantProviderError {
  const message =
    err instanceof Error ? err.message : "Unknown Claude Agent SDK startup error";
  return { kind: "startup", message, isRetryable: false, status: 500 };
}

/** An assistant turn reported an in-band error (auth, billing, rate limit, etc.). */
export function normalizeAssistantMessageError(
  error: SDKAssistantMessageError,
): AssistantProviderError {
  const isAuth = AUTH_ERRORS.includes(error);
  const isRateLimited = error === "rate_limit" || error === "overloaded";
  return {
    kind: "startup",
    message: `Claude Agent SDK error: ${error}`,
    isRetryable: isRateLimited,
    status: isAuth ? 401 : isRateLimited ? 429 : 500,
  };
}

/** Run completed but the result message reports a non-success subtype. */
export function normalizeResultError(
  result: Extract<SDKResultMessage, { type: "result" }>,
): AssistantProviderError {
  return {
    kind: "run",
    message: `Claude run finished with status: ${result.subtype}`,
    isRetryable: false,
    status: 500,
  };
}
