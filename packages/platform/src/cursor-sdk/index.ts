export {
  DEFAULT_CURSOR_MODEL_ID,
  loadCursorSdkConfig,
  buildAgentOsMcpServers,
  type CursorSdkConfig,
} from "@agent-os/platform/cursor-sdk/config";
export {
  CursorAgentError,
  CursorSdkError,
  isCursorSdkError,
  normalizeStartupError,
  normalizeRunError,
  type NormalizedCursorError,
  type CursorSdkFailureKind,
} from "@agent-os/platform/cursor-sdk/errors";
export {
  createCursorAgent,
  closeCursorAgent,
  type CreateCursorAgentOptions,
} from "@agent-os/platform/cursor-sdk/client";
export {
  sendAndCollectText,
  type SendAndWaitOptions,
  type SendAndWaitOutcome,
} from "@agent-os/platform/cursor-sdk/run";
