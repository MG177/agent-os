import { notFound } from "next/navigation";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ArchiveButton from "@/components/ArchiveButton";
import { getInboxItem } from "@/lib/vault";

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
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-4 pt-5 md:pb-0">
      <div className="flex items-center gap-3">
        <Link
          href="/inbox"
          className="flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Back to inbox"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4 text-slate-600"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
          {item.title}
        </h1>
      </div>

      {item.date && (
        <p className="text-xs font-medium text-slate-400">{item.date}</p>
      )}

      <div className="min-h-[120px] rounded-3xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
        {item.content.trim() ? (
          <MarkdownRenderer content={item.content} />
        ) : (
          <p className="text-sm italic text-slate-400">No content</p>
        )}
      </div>

      <ArchiveButton slug={slug} />
    </div>
  );
}
