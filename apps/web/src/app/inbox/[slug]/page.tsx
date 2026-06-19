import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LazyMarkdownRenderer } from "@/components/lazy";
import ArchiveButton from "@/components/ArchiveButton";
import { Page, PageBody } from "@/components/ui/layout";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInboxItem } from "@agent-os/platform/vault";

export default async function InboxItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const item = getInboxItem(slug);
  if (!item) notFound();

  return (
    <Page variant="read" fill>
      <PageHeader inset={false}>
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-slate-50"
            aria-label="Back to inbox"
          >
            <ChevronLeft
              strokeWidth={2}
              className="h-4 w-4 text-slate-600"
              aria-hidden
            />
          </Link>
          <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
            {item.title}
          </h1>
        </div>
      </PageHeader>

      {item.date && (
        <p className="shrink-0 text-xs font-medium text-slate-400">{item.date}</p>
      )}

      <PageBody fill inset={false} gap={false} className="min-h-0 space-y-4 overflow-y-auto">
        <div className="min-h-[120px] rounded-3xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
          {item.content.trim() ? (
            <LazyMarkdownRenderer content={item.content} />
          ) : (
            <p className="text-sm italic text-slate-400">No content</p>
          )}
        </div>

        <ArchiveButton slug={slug} />
      </PageBody>
    </Page>
  );
}
