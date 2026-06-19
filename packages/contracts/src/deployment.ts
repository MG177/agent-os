/** VPS/Docker = full (filesystem writes). Vercel lite = read-only app data + no Inbox capture. */

export const FILE_WRITES_DISABLED_CODE = "FILE_WRITES_DISABLED";

export const FILE_WRITES_DISABLED_MESSAGE =
  "Filesystem writes are disabled on this deployment (lite/read-only). Use the full VPS instance for capture, undo, and audit history.";

export class FileWritesDisabledError extends Error {
  readonly code = FILE_WRITES_DISABLED_CODE;

  constructor(message = FILE_WRITES_DISABLED_MESSAGE) {
    super(message);
    this.name = "FileWritesDisabledError";
  }
}

export type DeploymentMode = "full" | "lite";

/** Explicit `AGENT_OS_DEPLOYMENT` wins; otherwise Vercel is treated as lite. */
export function getDeploymentMode(): DeploymentMode {
  const explicit = process.env.AGENT_OS_DEPLOYMENT?.trim().toLowerCase();
  if (explicit === "lite" || explicit === "readonly") return "lite";
  if (explicit === "full") return "full";
  if (process.env.VERCEL === "1") return "lite";
  return "full";
}

export function fileWritesEnabled(): boolean {
  return getDeploymentMode() === "full";
}

export function assertFileWritesEnabled(): void {
  if (!fileWritesEnabled()) {
    throw new FileWritesDisabledError();
  }
}

export function isFileWritesDisabledError(
  error: unknown,
): error is FileWritesDisabledError {
  return error instanceof FileWritesDisabledError;
}

export function fileWritesDisabledResponse(): Response {
  return Response.json(
    {
      error: FILE_WRITES_DISABLED_MESSAGE,
      code: FILE_WRITES_DISABLED_CODE,
      deployment: getDeploymentMode(),
    },
    { status: 503 },
  );
}
