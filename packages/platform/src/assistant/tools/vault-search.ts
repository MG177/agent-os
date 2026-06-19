import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { VAULT_PATH } from "@agent-os/platform/vault";

const ALLOWED_SECTIONS = ["Projects", "Areas", "Resources", "Ideas", "Inbox"];
const MAX_RESULTS = 15;
const MAX_FILES_SCANNED = 400;

export interface VaultSearchHit {
  path: string;
  title: string;
  snippet: string;
}

function isSafeRelative(rel: string): boolean {
  const segments = rel.split("/").filter(Boolean);
  if (!segments.length || !ALLOWED_SECTIONS.includes(segments[0])) {
    return false;
  }
  for (const seg of segments) {
    if (seg === ".." || seg === ".") return false;
  }
  const resolved = path.resolve(VAULT_PATH, ...segments);
  return resolved.startsWith(path.resolve(VAULT_PATH));
}

function walkMarkdown(
  dir: string,
  relPrefix: string[],
  hits: VaultSearchHit[],
  queryLower: string,
  scanned: { count: number },
): void {
  if (scanned.count >= MAX_FILES_SCANNED || hits.length >= MAX_RESULTS) return;
  if (!fs.existsSync(dir)) return;

  for (const name of fs.readdirSync(dir)) {
    if (scanned.count >= MAX_FILES_SCANNED || hits.length >= MAX_RESULTS) {
      return;
    }
    if (name.startsWith(".") || name.startsWith("_")) continue;

    const abs = path.join(dir, name);
    const rel = [...relPrefix, name];
    const stat = fs.statSync(abs);

    if (stat.isDirectory()) {
      walkMarkdown(abs, rel, hits, queryLower, scanned);
      continue;
    }

    if (!name.endsWith(".md")) continue;
    scanned.count += 1;

    const raw = fs.readFileSync(abs, "utf-8");
    const { data, content } = matter(raw);
    const title =
      (data.title as string | undefined) || name.replace(/\.md$/, "");
    const haystack = `${title}\n${content}`.toLowerCase();
    if (!haystack.includes(queryLower)) continue;

    const idx = haystack.indexOf(queryLower);
    const snippetStart = Math.max(0, idx - 40);
    const snippet = content.slice(snippetStart, snippetStart + 120).trim();

    hits.push({
      path: rel.join("/"),
      title,
      snippet: snippet || title,
    });
  }
}

export function searchVaultNotes(query: string): VaultSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: VaultSearchHit[] = [];
  const scanned = { count: 0 };

  for (const section of ALLOWED_SECTIONS) {
    const sectionPath = path.join(VAULT_PATH, section);
    walkMarkdown(sectionPath, [section], hits, q, scanned);
    if (hits.length >= MAX_RESULTS) break;
  }

  return hits.slice(0, MAX_RESULTS);
}

export function parseVaultPath(pathStr: string): string[] | null {
  const segments = pathStr
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);
  if (!isSafeRelative(segments.join("/"))) return null;
  return segments;
}
