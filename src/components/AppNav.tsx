"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconActivity,
  IconCapture,
  IconHome,
  IconNutrition,
} from "@/components/ui/icons";

const TABS = [
  {
    href: "/",
    label: "Home",
    match: (p: string) => p === "/",
    Icon: IconHome,
  },
  {
    href: "/capture",
    label: "Capture",
    match: (p: string) => p.startsWith("/capture"),
    Icon: IconCapture,
  },
  {
    href: "/nutrition",
    label: "Nutrition",
    match: (p: string) => p.startsWith("/nutrition"),
    Icon: IconNutrition,
  },
  {
    href: "/activity",
    label: "Activity",
    match: (p: string) => p === "/activity",
    Icon: IconActivity,
  },
] as const;

/** Wireframe §5: persistent 4-tab bar on main screens */
export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/90 backdrop-blur-md md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
        {TABS.map(({ href, label, match, Icon }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <div className={`rounded-lg p-1 ${active ? "bg-blue-50" : ""}`}>
                <Icon active={active} className="h-4 w-4" />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  active ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
