import { z } from "zod";
import {
  listInbox,
  getInboxItem,
  createInboxItem,
  browseVault,
} from "@/lib/vault";
import {
  parseVaultPath,
  searchVaultNotes,
} from "@/lib/assistant/tools/vault-search";
import type { AssistantToolDefinition } from "@/lib/assistant/types";
import { FILE_WRITES_DISABLED_MESSAGE, fileWritesEnabled } from "@/lib/deployment";

const captureSchema = z.object({
  text: z.string(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const slugSchema = z.object({
  slug: z.string(),
});

const searchSchema = z.object({
  query: z.string(),
});

const readNoteSchema = z.object({
  path: z.string().describe("Vault-relative path, e.g. Projects/foo/bar.md"),
});

export const vaultTools: AssistantToolDefinition[] = [
  {
    name: "capture_note",
    description:
      "Capture a note to Obsidian Inbox only. Never write outside Inbox/.",
    module: "vault",
    boundary: "write",
    transport: "local",
    zodSchema: captureSchema,
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Note body" },
        title: { type: "string", description: "Optional title" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags (stored in body if provided)",
        },
      },
      required: ["text"],
    },
    execute: async (args) => {
      if (!fileWritesEnabled()) {
        return { error: FILE_WRITES_DISABLED_MESSAGE, code: "FILE_WRITES_DISABLED" };
      }
      const { text, title, tags } = captureSchema.parse(args);
      const noteTitle =
        title?.trim() ||
        text.trim().split("\n")[0].slice(0, 80) ||
        "Capture";
      let body = text.trim();
      if (tags?.length) {
        body += `\n\nTags: ${tags.join(", ")}`;
      }
      const item = createInboxItem(noteTitle, body, "capture-ui", {
        via: "assistant",
      });
      return {
        success: true,
        slug: item.slug,
        title: item.title,
        filename: item.filename,
      };
    },
  },
  {
    name: "list_inbox",
    description: "List recent Inbox captures for triage.",
    module: "vault",
    boundary: "read",
    transport: "local",
    zodSchema: z.object({}),
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      const items = listInbox().slice(0, 20);
      return {
        count: items.length,
        items: items.map((i) => ({
          slug: i.slug,
          title: i.title,
          date: i.date,
        })),
      };
    },
  },
  {
    name: "read_inbox_item",
    description: "Read a single Inbox note by slug.",
    module: "vault",
    boundary: "read",
    transport: "local",
    zodSchema: slugSchema,
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Inbox slug without .md" },
      },
      required: ["slug"],
    },
    execute: async (args) => {
      const { slug } = slugSchema.parse(args);
      const item = getInboxItem(slug);
      if (!item) return { error: "Inbox item not found", slug };
      return {
        slug: item.slug,
        title: item.title,
        content: item.content,
        date: item.date,
        tags: item.tags,
      };
    },
  },
  {
    name: "search_vault",
    description:
      "Search read-only vault notes (Projects, Areas, Resources, Ideas, Inbox). No writes.",
    module: "vault",
    boundary: "read-only",
    transport: "local",
    zodSchema: searchSchema,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text" },
      },
      required: ["query"],
    },
    execute: async (args) => {
      const { query } = searchSchema.parse(args);
      const hits = searchVaultNotes(query);
      return { query, count: hits.length, hits };
    },
  },
  {
    name: "read_note",
    description:
      "Read a vault markdown file by relative path (read-only).",
    module: "vault",
    boundary: "read-only",
    transport: "local",
    zodSchema: readNoteSchema,
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "e.g. Projects/lumendev-personal-agent-os/foo.md",
        },
      },
      required: ["path"],
    },
    execute: async (args) => {
      const { path: pathStr } = readNoteSchema.parse(args);
      const segments = parseVaultPath(pathStr);
      if (!segments) {
        return { error: "Invalid or disallowed vault path", path: pathStr };
      }
      const result = browseVault(segments);
      if (!result) return { error: "Note not found", path: pathStr };
      if (result.type === "directory") {
        return {
          error: "Path is a directory, not a file",
          path: pathStr,
          entries: result.entries.slice(0, 30),
        };
      }
      return {
        path: segments.join("/"),
        title: result.title,
        content: result.content,
        frontmatter: result.frontmatter,
      };
    },
  },
];
