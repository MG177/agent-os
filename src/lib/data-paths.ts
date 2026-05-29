import path from "path";

const HOME = process.env.HOME || "/root";

/** Persistent app data (audit log). */
export const AGENT_OS_DATA =
  process.env.AGENT_OS_DATA_PATH ||
  path.join(HOME, ".local", "share", "agent-os");
