"use client";

import AssistantChat from "@/components/assistant/AssistantChat";
import AssistantSessionList from "@/components/assistant/AssistantSessionList";
import AssistantSessionToolbar from "@/components/assistant/AssistantSessionToolbar";
import { useAssistantSession } from "@/components/assistant/AssistantSessionContext";
import { Page, PageBody } from "@/components/ui/layout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AssistantPageLayout() {
  const { historyOpen, setHistoryOpen, error } = useAssistantSession();

  return (
    <Page variant="dashboard" scroll="inner">
      <PageBody fill gap={false} className="overflow-hidden pb-0 pt-0 md:pb-0 md:pt-0">
        <PageHeader
          inset={false}
          className="relative flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-0 py-3 md:py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200">
              AI
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
                Assistant
              </h1>
              <p className="text-xs text-slate-400">
                Chat, capture, and log across your Agent OS
              </p>
            </div>
          </div>
          <AssistantSessionToolbar />
        </PageHeader>

        {error && (
          <p className="shrink-0 border-b border-amber-100 bg-amber-50 py-2 text-xs text-amber-800">
            {error}
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="hidden w-56 shrink-0 md:flex lg:w-64">
            <AssistantSessionList variant="sidebar" />
          </div>

          {historyOpen && (
            <div className="md:hidden">
              <AssistantSessionList
                variant="sheet"
                onClose={() => setHistoryOpen(false)}
              />
            </div>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col py-4 md:py-5">
            <AssistantChat />
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
