import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  appendAudit,
  hashPayload,
  isWithinUndoWindow,
  type AuditSource,
} from "@/lib/audit";
import { assertFileWritesEnabled } from "@/lib/deployment";

export const VAULT_PATH = process.env.VAULT_PATH || "/root/PARA";
export const INBOX_PATH = path.join(VAULT_PATH, "Inbox");
export const ARCHIVE_PATH = path.join(VAULT_PATH, "_Archive");

const ALLOWED_SECTIONS = ["Projects", "Areas", "Resources", "Ideas", "Inbox"];

// ── Types ─────────────────────────────────────────────────────────

export interface InboxItem {
  slug: string;
  filename: string;
  title: string;
  date?: string;
  tags?: string[];
  mtime: number;
}

export interface InboxItemDetail extends InboxItem {
  content: string;
  rawFrontmatter: Record<string, unknown>;
}

export interface BrowseEntry {
  name: string;
  type: "file" | "directory";
}

export interface BrowseDirectoryResult {
  type: "directory";
  section: string;
  relPath: string;
  entries: BrowseEntry[];
}

export interface BrowseFileResult {
  type: "file";
  filename: string;
  title: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

export type BrowseResult = BrowseDirectoryResult | BrowseFileResult;

export interface BrowseColumn {
  path: string[];
  entries: BrowseEntry[];
}

// ── Slug helpers ───────────────────────────────────────────────────

export function filenameToSlug(filename: string): string {
  return filename.replace(/\.md$/, "");
}

export function slugToFilename(slug: string): string {
  return slug + ".md";
}

// ── Inbox ──────────────────────────────────────────────────────────

export function listInbox(): InboxItem[] {
  if (!fs.existsSync(INBOX_PATH)) return [];

  const files = fs
    .readdirSync(INBOX_PATH)
    .filter((f) => {
      if (!f.endsWith(".md")) return false;
      if (f === "Inbox.md") return false;
      if (f.startsWith(".") || f.startsWith("_")) return false;
      return true;
    });

  const items: InboxItem[] = files.map((filename) => {
    const filePath = path.join(INBOX_PATH, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const stat = fs.statSync(filePath);

    const title =
      (data.title as string | undefined) || filename.replace(/\.md$/, "");

    return {
      slug: filenameToSlug(filename),
      filename,
      title,
      date: data.date ? String(data.date) : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
      mtime: stat.mtimeMs,
    };
  });

  return items.sort((a, b) => b.mtime - a.mtime);
}

export function getInboxItem(slug: string): InboxItemDetail | null {
  const filename = slugToFilename(slug);
  const filePath = path.join(INBOX_PATH, filename);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stat = fs.statSync(filePath);

  const title =
    (data.title as string | undefined) || filename.replace(/\.md$/, "");

  return {
    slug,
    filename,
    title,
    date: data.date ? String(data.date) : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    mtime: stat.mtimeMs,
    content,
    rawFrontmatter: data,
  };
}

export function createInboxItem(
  title: string,
  body: string,
  source: AuditSource = "capture-ui",
  auditMeta?: Record<string, unknown>,
): InboxItem {
  assertFileWritesEnabled();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const safeTitle = title.replace(/[/\0:]/g, "-").trim();

  // Include time-of-day to avoid collisions for two captures with the same title on the same day.
  const hhmm = now.toISOString().slice(11, 16).replace(":", "");
  let filename = `${dateStr} ${safeTitle}.md`;
  let filePath = path.join(INBOX_PATH, filename);
  if (fs.existsSync(filePath)) {
    filename = `${dateStr} ${hhmm} ${safeTitle}.md`;
    filePath = path.join(INBOX_PATH, filename);
    if (fs.existsSync(filePath)) {
      const ss = now.toISOString().slice(17, 19);
      filename = `${dateStr} ${hhmm}${ss} ${safeTitle}.md`;
      filePath = path.join(INBOX_PATH, filename);
    }
  }

  const fileContent =
    `---\ndate: ${dateStr}\ntitle: ${JSON.stringify(title)}\n---\n\n${body}`.trimEnd() +
    "\n";
  fs.mkdirSync(INBOX_PATH, { recursive: true });
  fs.writeFileSync(filePath, fileContent, "utf-8");

  const stat = fs.statSync(filePath);
  const slug = filenameToSlug(filename);

  appendAudit({
    source,
    action: "capture.create",
    target: slug,
    payload_hash: hashPayload({ title, body }),
    meta: { filename, title, ...auditMeta },
  });

  return {
    slug,
    filename,
    title,
    date: dateStr,
    mtime: stat.mtimeMs,
  };
}

export type ArchiveResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "expired" };

export function archiveInboxItem(
  slug: string,
  source: AuditSource = "capture-ui",
): ArchiveResult {
  assertFileWritesEnabled();
  const filename = slugToFilename(slug);
  const srcPath = path.join(INBOX_PATH, filename);
  if (!fs.existsSync(srcPath)) return { ok: false, reason: "not-found" };

  const stat = fs.statSync(srcPath);
  if (!isWithinUndoWindow(stat.mtimeMs)) {
    return { ok: false, reason: "expired" };
  }

  fs.mkdirSync(ARCHIVE_PATH, { recursive: true });

  let destPath = path.join(ARCHIVE_PATH, filename);
  if (fs.existsSync(destPath)) {
    const base = filename.replace(/\.md$/, "");
    destPath = path.join(ARCHIVE_PATH, `${base}-${Date.now()}.md`);
  }

  fs.renameSync(srcPath, destPath);

  appendAudit({
    source,
    action: "capture.revert",
    target: slug,
    payload_hash: hashPayload({ slug, archived: path.basename(destPath) }),
    meta: { archivedAs: path.basename(destPath) },
  });

  return { ok: true };
}

// ── Browse (read-only vault) ───────────────────────────────────────

function isSafeVaultPath(segments: string[]): boolean {
  if (segments.length === 0) return false;
  if (!ALLOWED_SECTIONS.includes(segments[0])) return false;
  for (const seg of segments) {
    if (seg === ".." || seg === ".") return false;
  }
  const resolved = path.resolve(VAULT_PATH, ...segments);
  return resolved.startsWith(path.resolve(VAULT_PATH));
}

export function browseVault(segments: string[]): BrowseResult | null {
  if (!isSafeVaultPath(segments)) return null;

  const absPath = path.resolve(VAULT_PATH, ...segments);
  if (!fs.existsSync(absPath)) return null;

  const stat = fs.statSync(absPath);

  if (stat.isDirectory()) {
    const entries: BrowseEntry[] = fs
      .readdirSync(absPath)
      .filter((name) => !name.startsWith(".") && !name.startsWith("_"))
      .map((name) => {
        const entryPath = path.join(absPath, name);
        const isDir = fs.statSync(entryPath).isDirectory();
        return {
          name,
          type: isDir ? ("directory" as const) : ("file" as const),
        };
      })
      .filter((e) => e.type === "directory" || e.name.endsWith(".md"))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return {
      type: "directory",
      section: segments[0],
      relPath: segments.join("/"),
      entries,
    };
  }

  const raw = fs.readFileSync(absPath, "utf-8");
  const { data, content } = matter(raw);
  const filename = segments[segments.length - 1];
  const title =
    (data.title as string | undefined) || filename.replace(/\.md$/, "");

  return {
    type: "file",
    filename,
    title,
    content,
    frontmatter: data,
  };
}

/** Directory columns for Finder-style navigation (one column per path prefix). */
export function getBrowseColumnStack(segments: string[]): {
  columns: BrowseColumn[];
  file: BrowseFileResult | null;
} {
  if (!isSafeVaultPath(segments)) {
    return { columns: [], file: null };
  }

  const columns: BrowseColumn[] = [];
  let file: BrowseFileResult | null = null;

  for (let i = 1; i <= segments.length; i++) {
    const partial = segments.slice(0, i);
    const result = browseVault(partial);
    if (!result) break;
    if (result.type === "directory") {
      columns.push({ path: partial, entries: result.entries });
    } else {
      file = result;
      break;
    }
  }

  return { columns, file };
}
