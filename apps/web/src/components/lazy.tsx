"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CalendarTimeGrid } from "@/components/calendar/CalendarTimeGrid";
import type AssistantChat from "@/components/assistant/AssistantChat";
import type FoodWorkspace from "@/components/nutrition/panels/FoodWorkspace";
import type MarkdownRenderer from "@/components/MarkdownRenderer";

function MarkdownSkeleton() {
  return (
    <div
      className="min-h-[12rem] animate-pulse rounded-2xl bg-slate-100"
      role="status"
      aria-label="Loading content"
    />
  );
}

function CalendarGridSkeleton() {
  return (
    <div
      className="app-card flex min-h-[28rem] flex-col overflow-hidden p-3 md:min-h-[32rem]"
      role="status"
      aria-label="Loading calendar grid"
    >
      <div className="mb-3 flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 flex-1 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-8 gap-1.5">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function AssistantChatSkeleton() {
  return (
    <div
      className="flex min-h-[min(70vh,40rem)] flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4"
      role="status"
      aria-label="Loading assistant"
    >
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-50" />
      <div className="mt-auto h-12 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function FoodWorkspaceSkeleton() {
  return (
    <div
      className="app-card flex min-h-[24rem] flex-col gap-3 p-4 md:min-h-[28rem]"
      role="status"
      aria-label="Loading food library"
    >
      <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-50" />
      ))}
    </div>
  );
}

export const LazyMarkdownRenderer = dynamic(
  () => import("@/components/MarkdownRenderer"),
  { loading: MarkdownSkeleton },
);

export const LazyCalendarTimeGrid = dynamic(
  () =>
    import("@/components/calendar/CalendarTimeGrid").then((m) => ({
      default: m.CalendarTimeGrid,
    })),
  { loading: CalendarGridSkeleton },
);

export const LazyAssistantChat = dynamic(
  () => import("@/components/assistant/AssistantChat"),
  { loading: AssistantChatSkeleton },
);

export const LazyFoodWorkspace = dynamic(
  () => import("@/components/nutrition/panels/FoodWorkspace"),
  { loading: FoodWorkspaceSkeleton },
);

export type LazyMarkdownRendererProps = ComponentProps<typeof MarkdownRenderer>;
export type LazyCalendarTimeGridProps = ComponentProps<typeof CalendarTimeGrid>;
export type LazyAssistantChatProps = ComponentProps<typeof AssistantChat>;
export type LazyFoodWorkspaceProps = ComponentProps<typeof FoodWorkspace>;
