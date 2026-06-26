import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  FolderKanban,
  Layers,
  Lightbulb,
} from "lucide-react";
import InboxQueue from "@/components/browse/InboxQueue";
import { Page, PageBody } from "@/components/ui/layout";
import { browseVault } from "@agent-os/platform/vault";

type Section = {
  name: string;
  description: string;
  Icon: typeof FolderKanban;
  tile: string;
  dot: string;
  accent: string;
};

const SECTIONS: Section[] = [
  {
    name: "Projects",
    description: "Active efforts with a goal and a finish line.",
    Icon: FolderKanban,
    tile: "bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
    accent: "text-blue-600",
  },
  {
    name: "Areas",
    description: "Ongoing responsibilities you maintain over time.",
    Icon: Layers,
    tile: "bg-violet-50 text-violet-600",
    dot: "bg-violet-500",
    accent: "text-violet-600",
  },
  {
    name: "Resources",
    description: "Topics and references worth keeping around.",
    Icon: BookOpen,
    tile: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
    accent: "text-emerald-600",
  },
  {
    name: "Ideas",
    description: "Sparks and notes still waiting to take shape.",
    Icon: Lightbulb,
    tile: "bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
    accent: "text-amber-600",
  },
];

function countEntries(section: string): number {
  const result = browseVault([section]);
  return result && result.type === "directory" ? result.entries.length : 0;
}

export default function BrowseHubPage() {
  const sections = SECTIONS.map((section) => ({
    ...section,
    count: countEntries(section.name),
  }));

  return (
    <div className="flex min-h-0 flex-col bg-slate-50 md:h-full">
      {/* Toolbar — matches the column browser header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          Browse
        </h1>
        <span className="shrink-0 text-xs tabular-nums text-slate-400">
          Vault
        </span>
      </div>

      <div className="min-h-0 flex-1 md:overflow-y-auto">
        <Page variant="dashboard" fill={false}>
          <PageBody>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
              {/* Inbox triage queue */}
              <div className="lg:col-span-5 xl:col-span-4">
                <InboxQueue />
              </div>

              {/* PARA section selector */}
              <div className="flex flex-col gap-3 lg:col-span-7 xl:col-span-8">
                <div className="flex items-baseline justify-between">
                  <p className="app-section-label">PARA · file into</p>
                  <p className="text-xs text-slate-400">Pick a section</p>
                </div>

                <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                  {sections.map(
                    ({ name, description, Icon, tile, dot, accent, count }) => (
                      <Link
                        key={name}
                        href={`/browse/${name}`}
                        className="app-card group flex flex-col gap-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tile}`}
                          >
                            <Icon
                              strokeWidth={1.8}
                              className="h-5 w-5"
                              aria-hidden
                            />
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums text-slate-400">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${dot}`}
                              aria-hidden
                            />
                            {count} {count === 1 ? "item" : "items"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-base font-semibold text-slate-900">
                            {name}
                          </h2>
                          <p className="text-sm text-slate-500">{description}</p>
                        </div>

                        <span
                          className={`mt-auto inline-flex items-center gap-1 text-sm font-medium ${accent}`}
                        >
                          Browse
                          <ChevronRight
                            strokeWidth={2}
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </PageBody>
        </Page>
      </div>
    </div>
  );
}
