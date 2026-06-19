"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Apple, ChevronRight, Maximize2, Pencil, Sparkles, X } from "lucide-react";
import AssistantChat from "@/components/assistant/AssistantChat";
import AssistantSessionList from "@/components/assistant/AssistantSessionList";
import AssistantSessionToolbar from "@/components/assistant/AssistantSessionToolbar";
import { useAssistantSession } from "@/components/assistant/AssistantSessionContext";
import QuickCapturePanel from "@/components/quick/QuickCapturePanel";
import QuickMealPanel from "@/components/quick/QuickMealPanel";
import { useQuickPanel, type QuickPanelId } from "@/components/QuickPanelContext";

const ACTIONS: { id: QuickPanelId; label: string; Icon: LucideIcon }[] = [
  { id: "capture", label: "Quick capture", Icon: Pencil },
  { id: "meal", label: "Log a meal", Icon: Apple },
  { id: "assistant", label: "Assistant", Icon: Sparkles },
];

const TITLES: Record<QuickPanelId, string> = {
  capture: "Quick capture",
  meal: "Log a meal",
  assistant: "Assistant",
};

/** Vertical icon rail — always visible on desktop, vertically centered. */
function Rail({
  active,
  onSelect,
}: {
  active: QuickPanelId | null;
  onSelect: (id: QuickPanelId) => void;
}) {
  return (
    <div
      className={`app-quick-rail hidden w-14 shrink-0 flex-col items-center justify-center gap-2 border-l bg-white md:flex ${active ? "border-slate-100" : "border-slate-200"
        }`}
      role="tablist"
      aria-label="Quick actions"
    >
      {ACTIONS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(id)}
            title={label}
            aria-label={label}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              }`}
          >
            <Icon strokeWidth={1.8} className="h-5 w-5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function AssistantPanelChrome({ children }: { children: ReactNode }) {
  const { historyOpen, setHistoryOpen } = useAssistantSession();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {historyOpen && (
        <AssistantSessionList
          variant="sheet"
          onClose={() => setHistoryOpen(false)}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">{children}</div>
    </div>
  );
}

/** Shared panel body — the active tool plus its scroll container. */
function PanelBody({ shown }: { shown: QuickPanelId }) {
  if (shown === "assistant") {
    return (
      <AssistantPanelChrome>
        <AssistantChat />
      </AssistantPanelChrome>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
      {shown === "capture" && <QuickCapturePanel />}
      {shown === "meal" && <QuickMealPanel />}
    </div>
  );
}

function AssistantPanelHeaderActions({ onClose }: { onClose?: () => void }) {
  const { activeSessionId } = useAssistantSession();
  const fullscreenHref = activeSessionId
    ? `/assistant/${activeSessionId}`
    : "/assistant";

  return (
    <>
      <AssistantSessionToolbar />
      <Link
        href={fullscreenHref}
        title="Open full screen"
        aria-label="Open Assistant full screen"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        <Maximize2 strokeWidth={1.8} className="h-4 w-4" aria-hidden />
      </Link>
    </>
  );
}

export default function QuickPanel() {
  const { active, toggle, close, ready } = useQuickPanel();
  const shown = ready ? active : null;

  // Escape closes the panel (matters most for the mobile sheet).
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, close]);

  return (
    <>
      {/* Mobile: slide-up sheet above the bottom nav */}
      {shown && (
        <div className="md:hidden" role="dialog" aria-modal="true" aria-label={TITLES[shown]}>
          <button
            type="button"
            onClick={close}
            aria-label="Close panel"
            className="fixed inset-x-0 bottom-16 top-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 bottom-16 z-40 flex max-h-[80dvh] flex-col rounded-t-3xl border-t border-slate-200 bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                {shown === "assistant" && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                    AI
                  </span>
                )}
                <p className="text-sm font-bold text-slate-900">{TITLES[shown]}</p>
              </div>
              <div className="flex items-center gap-1">
                {shown === "assistant" && (
                  <AssistantPanelHeaderActions onClose={close} />
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close panel"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <X strokeWidth={2} className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>
            <PanelBody shown={shown} />
          </div>
        </div>
      )}

      {/* Desktop: dim the content layer beneath the floating panel */}
      {shown && (
        <button
          type="button"
          onClick={close}
          aria-label="Close panel"
          className="fixed inset-0 z-30 hidden bg-slate-900/30 backdrop-blur-sm md:block"
        />
      )}

      {/* Desktop: overlay panel — floats above page content, blended with the rail */}
      {shown && (
        <aside
          className="fixed inset-y-0 right-14 z-40 hidden w-[22rem] flex-col overflow-hidden rounded-l-3xl bg-white shadow-2xl md:flex lg:w-96"
          aria-label={TITLES[shown]}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              {shown === "assistant" && (
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                  AI
                </span>
              )}
              <p className="text-sm font-bold text-slate-900">{TITLES[shown]}</p>
            </div>
            <div className="flex items-center gap-1">
              {shown === "assistant" && (
                <AssistantPanelHeaderActions onClose={close} />
              )}
              <button
                type="button"
                onClick={close}
                title="Collapse"
                aria-label="Collapse panel"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <ChevronRight strokeWidth={2} className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>

          <PanelBody shown={shown} />
        </aside>
      )}

      <Rail active={shown} onSelect={toggle} />
    </>
  );
}
