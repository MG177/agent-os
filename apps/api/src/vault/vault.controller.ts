import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  archiveInboxItem,
  browseVault,
  createInboxItem,
  getInboxItem,
  listInbox,
} from "@agent-os/platform/vault";
import { titleFromCapture } from "@agent-os/platform/inbox-capture";
import type { AuditSource } from "@agent-os/platform/audit";
import { buildActivityFeed } from "@agent-os/platform/activity";
import { isFileWritesDisabledError } from "@agent-os/contracts/deployment";

const ALLOWED_SOURCES: AuditSource[] = ["capture-ui", "whatsapp"];

const InboxCreateSchema = z.object({
  title: z.string().max(300).optional(),
  body: z.string().max(10_000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  source: z.string().max(50).optional(),
});

function writesDisabled(res: Response) {
  return res.status(503).json({
    error:
      "Filesystem writes are disabled on this deployment (lite/read-only).",
    code: "FILE_WRITES_DISABLED",
  });
}

@Controller()
export class VaultController {
  @Get("inbox")
  inboxList(@Res() res: Response) {
    return res.json({ items: listInbox() });
  }

  @Post("inbox")
  inboxCreate(@Body() raw: unknown, @Res() res: Response) {
    const parsed = InboxCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { title, body: content, tags, source } = parsed.data;

    const text = content?.trim() ?? title?.trim() ?? "";
    if (!text) {
      return res.status(400).json({ error: "Note text is required" });
    }

    const resolvedTitle = titleFromCapture(title, content);
    let noteBody = content?.trim() ?? "";
    if (tags?.length) {
      const tagLine = tags
        .map((t) => (t.startsWith("#") ? t : `#${t}`))
        .join(" ");
      noteBody = noteBody ? `${noteBody}\n\n${tagLine}` : tagLine;
    }

    const resolvedSource: AuditSource =
      source && ALLOWED_SOURCES.includes(source as AuditSource)
        ? (source as AuditSource)
        : "capture-ui";

    try {
      const item = createInboxItem(resolvedTitle, noteBody, resolvedSource);
      return res.status(201).json({ item });
    } catch (error) {
      if (isFileWritesDisabledError(error)) return writesDisabled(res);
      throw error;
    }
  }

  @Get("inbox/:slug")
  inboxGet(@Param("slug") slug: string, @Res() res: Response) {
    const item = getInboxItem(slug);
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json({ item });
  }

  @Delete("inbox/:slug")
  inboxDelete(@Param("slug") slug: string, @Res() res: Response) {
    let result;
    try {
      result = archiveInboxItem(slug);
    } catch (error) {
      if (isFileWritesDisabledError(error)) return writesDisabled(res);
      throw error;
    }
    if (!result.ok) {
      if (result.reason === "expired") {
        return res.status(410).json({ error: "Undo window (24h) has expired" });
      }
      return res.status(404).json({ error: "Not found" });
    }
    return res.json({ archived: true });
  }

  @Get("browse/*path")
  browse(@Req() req: Request, @Res() res: Response) {
    const rest = req.path.replace(/^\/api\/browse\/?/, "");
    const segments = rest
      ? rest.split("/").filter(Boolean).map(decodeURIComponent)
      : [];
    const result = browseVault(segments);
    if (!result) {
      return res.status(404).json({ error: "Not found or access denied" });
    }
    return res.json(result);
  }

  @Get("activity")
  async activity(@Res() res: Response) {
    return res.json({ events: await buildActivityFeed(100) });
  }
}
