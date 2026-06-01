"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Folder } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type {
  BrowseColumn,
  BrowseEntry,
  BrowseFileResult,
} from "@/lib/vault";

function buildBrowseUrl(segments: string[]): string {
  return "/browse/" + segments.map(encodeURIComponent).join("/");
}

function apiBrowseUrl(segments: string[]): string {
  return `/api/browse/${segments.map(encodeURIComponent).join("/")}`;
}

function parseBrowsePath(pathname: string): string[] {
  if (!pathname.startsWith("/browse/")) return [];
  return pathname
    .slice("/browse/".length)
    .split("/")
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);
}

const ICON_SM = "h-3.5 w-3.5 shrink-0";

function FolderIcon({ className }: { className?: string; filled?: boolean }) {
  return (
    <Folder
      strokeWidth={1.5}
      className={`${ICON_SM} ${className ?? ""}`}
      aria-hidden
    />
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <FileText
      strokeWidth={1.5}
      className={`${ICON_SM} ${className ?? ""}`}
      aria-hidden
    />
  );
}

function RowChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      strokeWidth={2}
      className={`h-3 w-3 shrink-0 opacity-50 ${className ?? ""}`}
      aria-hidden
    />
  );
}

function ColumnRow({
  selected,
  isDirectory,
  label,
  onClick,
}: {
  selected: boolean;
  isDirectory: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <li className="px-1">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full min-h-[1.625rem] items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm leading-tight transition-colors ${
          selected
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-800 hover:bg-slate-100/90"
        }`}
        role="option"
        aria-selected={selected}
      >
        {isDirectory ? (
          <FolderIcon
            filled={selected}
            className={selected ? "text-white" : "text-blue-500"}
          />
        ) : (
          <FileIcon className={selected ? "text-white" : "text-slate-400"} />
        )}
        <span className={`min-w-0 flex-1 truncate ${selected ? "font-medium" : ""}`}>
          {label}
        </span>
        {isDirectory ? (
          <RowChevron className={selected ? "text-white/70" : undefined} />
        ) : (
          <span className="h-3 w-3 shrink-0" aria-hidden />
        )}
      </button>
    </li>
  );
}

type ColumnState = BrowseColumn & { loading?: boolean };

async function loadStackFromApi(segments: string[]): Promise<{
  columns: BrowseColumn[];
  file: BrowseFileResult | null;
}> {
  const columns: BrowseColumn[] = [];
  let file: BrowseFileResult | null = null;

  for (let i = 1; i <= segments.length; i++) {
    const partial = segments.slice(0, i);
    const res = await fetch(apiBrowseUrl(partial));
    if (!res.ok) break;
    const data = await res.json();
    if (data.type === "directory") {
      columns.push({ path: partial, entries: data.entries ?? [] });
    } else if (data.type === "file") {
      file = data as BrowseFileResult;
      break;
    }
  }

  return { columns, file };
}

function FilePreview({ file }: { file: BrowseFileResult }) {
  const fm = file.frontmatter;
  const date = fm.date ? String(fm.date) : undefined;
  const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : undefined;
  const status = fm.status ? String(fm.status) : undefined;
  const hasMeta = date || tags?.length || status;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-3">
        <h1 className="text-base font-semibold text-slate-900">{file.title}</h1>
        {hasMeta && (
          <div className="mt-2 flex flex-wrap gap-2">
            {date && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
                {date}
              </span>
            )}
            {status && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {status}
              </span>
            )}
            {tags?.map((tag) => (
              <span
                key={String(tag)}
                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600"
              >
                {String(tag)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
          {file.content.trim() ? (
            <MarkdownRenderer content={file.content} />
          ) : (
            <p className="text-sm italic text-slate-400">No content</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnList({
  column,
  columnIndex,
  selectedSegment,
  onSelect,
  mobileOnly,
}: {
  column: ColumnState;
  columnIndex: number;
  selectedSegment: string | undefined;
  onSelect: (columnIndex: number, entry: BrowseEntry) => void;
  mobileOnly?: boolean;
}) {
  const dirs = column.entries.filter((e) => e.type === "directory");
  const files = column.entries.filter((e) => e.type === "file");

  return (
    <div
      className={`flex h-full min-h-0 w-44 shrink-0 flex-col border-r border-slate-200/80 bg-[#f5f5f7] md:w-48 lg:w-52 ${
        mobileOnly ? "flex w-full md:hidden" : "hidden md:flex"
      }`}
      role="listbox"
      aria-label={
        column.path.length > 0
          ? column.path[column.path.length - 1]
          : "Browse"
      }
    >
      {column.loading ? (
        <div className="space-y-0.5 p-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="mx-1 h-[1.625rem] animate-pulse rounded-md bg-slate-200/60"
            />
          ))}
        </div>
      ) : column.entries.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-400">
          Empty folder
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {dirs.map((entry) => (
            <ColumnRow
              key={entry.name}
              selected={selectedSegment === entry.name}
              isDirectory
              label={entry.name}
              onClick={() => onSelect(columnIndex, entry)}
            />
          ))}
          {files.map((entry) => (
            <ColumnRow
              key={entry.name}
              selected={selectedSegment === entry.name}
              isDirectory={false}
              label={entry.name.replace(/\.md$/, "")}
              onClick={() => onSelect(columnIndex, entry)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ColumnBrowser({
  initialPath,
  initialColumns,
  initialFile,
}: {
  initialPath: string[];
  initialColumns: BrowseColumn[];
  initialFile: BrowseFileResult | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipPathSync = useRef(true);

  const [columns, setColumns] = useState<ColumnState[]>(initialColumns);
  const [file, setFile] = useState<BrowseFileResult | null>(initialFile);

  const pathFromUrl = parseBrowsePath(pathname);
  const activePath = pathFromUrl.length > 0 ? pathFromUrl : initialPath;

  const headerTitle =
    file?.title ??
    (activePath.length > 0
      ? activePath[activePath.length - 1].replace(/\.md$/, "")
      : "Browse");

  const itemCount =
    columns.length > 0
      ? columns[columns.length - 1].entries.length
      : 0;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  }, []);

  // Sync when navigating via sidebar / browser back-forward
  useEffect(() => {
    if (skipPathSync.current) {
      skipPathSync.current = false;
      return;
    }

    const urlPath = parseBrowsePath(pathname);
    const deepest = columns[columns.length - 1]?.path ?? [];
    const urlKey = urlPath.join("/");
    const colKey = deepest.join("/");
    const fileKey = file?.filename ?? "";
    const urlEndsWithFile =
      file && urlPath.length > 0 && urlPath[urlPath.length - 1] === file.filename;
    if (urlKey === colKey && (!file || urlEndsWithFile)) return;

    let cancelled = false;
    loadStackFromApi(urlPath.length > 0 ? urlPath : initialPath).then(
      ({ columns: next, file: nextFile }) => {
        if (cancelled) return;
        setColumns(next);
        setFile(nextFile);
        scrollToEnd();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToEnd();
  }, [columns.length, scrollToEnd]);

  async function selectEntry(columnIndex: number, entry: BrowseEntry) {
    const basePath = columns[columnIndex].path;
    const newPath = [...basePath, entry.name];
    const nextCols = columns.slice(0, columnIndex + 1);

    router.replace(buildBrowseUrl(newPath), { scroll: false });

    if (entry.type === "file") {
      setColumns(nextCols);
      setFile(null);
      try {
        const res = await fetch(apiBrowseUrl(newPath));
        if (res.ok) {
          const data = await res.json();
          if (data.type === "file") setFile(data as BrowseFileResult);
        }
      } catch {
        /* ignore */
      }
      return;
    }

    setColumns([
      ...nextCols,
      { path: newPath, entries: [], loading: true },
    ]);
    setFile(null);
    scrollToEnd();

    try {
      const res = await fetch(apiBrowseUrl(newPath));
      if (!res.ok) return;
      const data = await res.json();
      if (data.type === "directory") {
        setColumns([
          ...nextCols,
          { path: newPath, entries: data.entries ?? [] },
        ]);
        scrollToEnd();
      }
    } catch {
      setColumns(nextCols);
    }
  }

  function goUp() {
    const hasFile = !!file;
    const path = hasFile ? activePath.slice(0, -1) : activePath;
    // At a section root with nothing deeper open → back to the Browse landing.
    if (path.length <= 1 && !hasFile) {
      router.replace("/browse", { scroll: false });
      return;
    }
    if (path.length <= 1) {
      // File open directly under a section → drop back to that section's column.
      router.replace(buildBrowseUrl(path.length ? path : ["Projects"]), {
        scroll: false,
      });
      return;
    }
    router.replace(buildBrowseUrl(path.slice(0, -1)), { scroll: false });
  }

  const mobileColumnIndex = Math.max(0, columns.length - 1);
  const mobileColumn = columns[mobileColumnIndex];
  const mobileSelected =
    activePath.length > mobileColumn?.path.length
      ? activePath[mobileColumn.path.length]
      : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <button
          type="button"
          onClick={goUp}
          className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
          aria-label="Go back"
        >
          <ChevronLeft strokeWidth={2} className="h-4 w-4" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {headerTitle}
        </h1>
        {!file && (
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#ececef]">
        <div
          ref={scrollRef}
          className={`flex min-h-0 overflow-x-auto overflow-y-hidden scroll-smooth ${
            file
              ? "hidden shrink-0 md:flex md:max-w-[min(70%,42rem)]"
              : "min-w-0 flex-1"
          }`}
        >
          {columns.map((column, i) => {
            const selectedSegment =
              activePath.length > column.path.length
                ? activePath[column.path.length]
                : undefined;
            return (
              <ColumnList
                key={column.path.join("/")}
                column={column}
                columnIndex={i}
                selectedSegment={selectedSegment}
                onSelect={selectEntry}
              />
            );
          })}
          {mobileColumn && !file && (
            <ColumnList
              column={mobileColumn}
              columnIndex={mobileColumnIndex}
              selectedSegment={mobileSelected}
              onSelect={selectEntry}
              mobileOnly
            />
          )}
        </div>

        {file && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:border-l md:border-slate-200 md:min-w-[280px]">
            <FilePreview file={file} />
          </div>
        )}
      </div>
    </div>
  );
}
