import { getDb } from "@agent-os/platform/mongo";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
} from "@agent-os/core/integrations/token-crypto";
import type { ClickUpTokenRecord } from "@agent-os/contracts/integrations/clickup/types";
import { hasClickUpEnvToken } from "@agent-os/platform/integrations/clickup/config";

const INTEGRATION_ID = "clickup";

type TokenDoc = ClickUpTokenRecord & { _id: string };

async function collection() {
  const db = await getDb();
  return db.collection<TokenDoc>("integrations");
}

export async function loadTokenRecord(): Promise<ClickUpTokenRecord | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: INTEGRATION_ID });
  if (!doc) return null;
  const { _id: _ignored, ...record } = doc;
  return record as ClickUpTokenRecord;
}

export async function getAccessToken(): Promise<string | null> {
  const record = await loadTokenRecord();
  if (!record?.encryptedAccessToken || !hasEncryptionKey()) return null;
  try {
    return decryptSecret(record.encryptedAccessToken);
  } catch {
    return null;
  }
}

async function writeRecord(record: ClickUpTokenRecord): Promise<ClickUpTokenRecord> {
  const col = await collection();
  await col.replaceOne(
    { _id: INTEGRATION_ID },
    { _id: INTEGRATION_ID, ...record } as unknown as TokenDoc,
    { upsert: true },
  );
  return record;
}

export async function saveTokenRecord(input: {
  accessToken: string;
  userId: number;
  username?: string;
  teamId: string;
  teamName?: string;
}): Promise<ClickUpTokenRecord> {
  if (!hasEncryptionKey()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  const now = new Date().toISOString();
  const existing = await loadTokenRecord();
  return writeRecord({
    encryptedAccessToken: encryptSecret(input.accessToken),
    userId: input.userId,
    username: input.username ?? existing?.username,
    teamId: input.teamId,
    teamName: input.teamName ?? existing?.teamName,
    connectedAt: existing?.connectedAt ?? now,
    updatedAt: now,
  });
}

export async function setActiveTeam(
  teamId: string,
  teamName?: string,
): Promise<ClickUpTokenRecord> {
  const existing = await loadTokenRecord();
  if (!existing) {
    throw new Error("ClickUp is not connected");
  }
  return writeRecord({
    ...existing,
    teamId,
    teamName: teamName ?? existing.teamName,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTokenRecord(): Promise<void> {
  const col = await collection();
  await col.deleteOne({ _id: INTEGRATION_ID });
}

export async function isClickUpConnected(): Promise<boolean> {
  if (hasClickUpEnvToken()) return true;
  return (await getAccessToken()) !== null;
}
