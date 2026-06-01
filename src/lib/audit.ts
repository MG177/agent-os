import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AGENT_OS_DATA } from "@/lib/data-paths";
import { fileWritesEnabled } from "@/lib/deployment";

export { AGENT_OS_DATA } from "@/lib/data-paths";

export const AUDIT_LOG_PATH = path.join(AGENT_OS_DATA, "audit.jsonl");

export const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export type AuditAction =
  | "capture.create"
  | "capture.revert"
  | "nutrition.create"
  | "nutrition.update"
  | "nutrition.revert";

export type AuditSource =
  | "capture-ui"
  | "whatsapp"
  | "nutrition-form"
  | "nutrition-chat"
  | "system";

export interface AuditEntry {
  id: string;
  ts: number;
  source: AuditSource;
  action: AuditAction;
  target: string;
  payload_hash: string;
  meta?: Record<string, unknown>;
}

function ensureDir(): void {
  if (!fileWritesEnabled()) return;
  fs.mkdirSync(AGENT_OS_DATA, { recursive: true });
}

export function hashPayload(payload: unknown): string {
  const json = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex").slice(0, 16);
}

function newId(ts: number): string {
  return `${ts.toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

export function appendAudit(
  entry: Omit<AuditEntry, "id" | "ts"> & { ts?: number },
): AuditEntry {
  const ts = entry.ts ?? Date.now();
  const full: AuditEntry = { id: newId(ts), ts, ...entry };
  if (!fileWritesEnabled()) return full;
  ensureDir();
  fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(full) + "\n", "utf-8");
  return full;
}

export function readAudit(): AuditEntry[] {
  if (!fileWritesEnabled()) return [];
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
  const raw = fs.readFileSync(AUDIT_LOG_PATH, "utf-8");
  const entries: AuditEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as AuditEntry);
    } catch {
      // skip malformed
    }
  }
  return entries;
}

export function isWithinUndoWindow(ts: number): boolean {
  return Date.now() - ts < UNDO_WINDOW_MS;
}

export interface ReversibleState {
  createEntry: AuditEntry;
  reverted: boolean;
  revertEntry?: AuditEntry;
}

/** Group audit entries by target and resolve create/revert pairs. */
export function reversibleStates(action: AuditAction): ReversibleState[] {
  const all = readAudit();
  const revertAction = action.endsWith(".create")
    ? (action.replace(".create", ".revert") as AuditAction)
    : null;

  const creates = all.filter((e) => e.action === action);
  const reverts = revertAction
    ? all.filter((e) => e.action === revertAction)
    : [];

  return creates.map((createEntry) => {
    const revertEntry = reverts.find((r) => r.target === createEntry.target);
    return {
      createEntry,
      reverted: Boolean(revertEntry),
      revertEntry,
    };
  });
}
