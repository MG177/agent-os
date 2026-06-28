"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuickPanel } from "@/components/QuickPanelContext";
import {
  IconAssistant,
  IconCapture,
  IconHome,
  IconNutrition,
  IconTasks,
} from "@/components/ui/icons";

type Tab = {
  label: string;
  Icon: typeof IconHome;
} & (
  | { href: string; match: (p: string) => boolean; panel?: never }
  | { panel: "capture"; href?: never; match?: never }
);

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    match: (p: string) => p === "/",
    Icon: IconHome,
  },
  {
    panel: "capture",
    label: "Capture",
    Icon: IconCapture,
  },
  {
    href: "/nutrition",
    label: "Nutrition",
    match: (p: string) => p.startsWith("/nutrition"),
    Icon: IconNutrition,
  },
  {
    href: "/todo",
    label: "Todo",
    match: (p: string) => p.startsWith("/todo"),
    Icon: IconTasks,
  },
];

const ITEM_CLASS =
  "flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors";

function TabInner({
  label,
  Icon,
  active,
}: {
  label: string;
  Icon: typeof IconHome;
  active: boolean;
}) {
  return (
    <>
      <div className={`rounded-lg p-1 ${active ? "bg-accent" : ""}`}>
        <Icon active={active} className="h-4 w-4" />
      </div>
      <span
        className={`text-[10px] font-semibold tracking-wide ${
          active ? "text-primary" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </>
  );
}

/** Wireframe §5: persistent 4-tab bar on main screens, plus a floating Assistant button */
export default function AppNav() {
  const pathname = usePathname();
  const { active: panel, toggle, close } = useQuickPanel();
  const assistantActive = pathname.startsWith("/assistant");

  return (
    <>
      <Link
        href="/assistant"
        aria-label="Open Assistant"
        aria-current={assistantActive ? "page" : undefined}
        style={{ bottom: "calc(var(--app-mobile-nav-offset) + 1rem)" }}
        className={`app-assistant-fab fixed right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden ${
          panel ? "hidden" : ""
        } ${assistantActive ? "ring-2 ring-ring ring-offset-2" : ""}`}
      >
        <IconAssistant className="h-6 w-6" />
      </Link>

      <nav
        className="app-bottom-nav fixed bottom-0 left-0 right-0 border-t border-slate-200/80 bg-white/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main"
      >
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
          {TABS.map((tab) => {
            if (tab.panel) {
              const active = panel === tab.panel;
              return (
                <button
                  key={tab.panel}
                  type="button"
                  onClick={() => toggle("capture")}
                  aria-pressed={active}
                  className={`${ITEM_CLASS} ${active ? "text-primary" : "text-slate-400"}`}
                >
                  <TabInner label={tab.label} Icon={tab.Icon} active={active} />
                </button>
              );
            }
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => panel && close()}
                className={`${ITEM_CLASS} ${active ? "text-primary" : "text-slate-400"}`}
              >
                <TabInner label={tab.label} Icon={tab.Icon} active={active} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
