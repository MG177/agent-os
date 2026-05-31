import { CursorAgentError, CursorSdkError } from "@cursor/sdk";

export type CursorSdkFailureKind = "startup" | "run";

export interface NormalizedCursorError {
  kind: CursorSdkFailureKind;
  message: string;
  isRetryable: boolean;
  status?: number;
  code?: string;
}

export function isCursorSdkError(err: unknown): err is CursorSdkError {
  return err instanceof CursorSdkError;
}

/** Thrown before a run starts (auth, config, network). */
export function normalizeStartupError(err: unknown): NormalizedCursorError {
  if (isCursorSdkError(err)) {
    return {
      kind: "startup",
      message: err.message,
      isRetryable: err.isRetryable,
      status: err.status,
      code: err.code,
    };
  }
  if (err instanceof Error) {
    return {
      kind: "startup",
      message: err.message,
      isRetryable: false,
    };
  }
  return {
    kind: "startup",
    message: "Unknown Cursor SDK startup error",
    isRetryable: false,
  };
}

/** Run executed but finished with error status. */
export function normalizeRunError(
  runId: string,
  status: string,
): NormalizedCursorError {
  return {
    kind: "run",
    message: `Cursor run ${runId} finished with status: ${status}`,
    isRetryable: false,
  };
}

export { CursorAgentError, CursorSdkError };
