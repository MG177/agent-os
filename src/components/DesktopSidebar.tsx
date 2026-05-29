"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/SidebarContext";
import {
  IconActivity,
  IconCapture,
  IconHome,
  IconInbox,
  IconCalendar,
  IconNutrition,
  IconBrowse,
} from "@/components/ui/icons";

const PRIMARY = [
  { href: "/", label: "Home", match: (p: string) => p === "/", Icon: IconHome },
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

const VAULT_SECTIONS = [
  { href: "/browse/Projects", label: "Projects", dot: "bg-blue-500" },
  { href: "/browse/Areas", label: "Areas", dot: "bg-violet-500" },
  { href: "/browse/Resources", label: "Resources", dot: "bg-emerald-500" },
  { href: "/browse/Ideas", label: "Ideas", dot: "bg-amber-400" },
] as const;

type IconComponent = React.ComponentType<{
  className?: string;
  active?: boolean;
}>;

function NavItem({
  href,
  label,
  active,
  Icon,
  collapsed,
}: {
  href: string;
  label: string;
  active: boolean;
  Icon: IconComponent;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-xl text-sm font-medium transition-colors ${collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
        } ${active
          ? "bg-blue-50 text-blue-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }`}
    >
      <Icon className={`shrink-0 ${collapsed ? "h-5 w-5" : "h-4 w-4"}`} />
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
    </Link>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, ready } = useSidebar();
  const vaultActive = pathname.startsWith("/browse");

  return (
    <aside
      className={`relative hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out md:flex ${collapsed ? "w-[4.5rem]" : "w-60 lg:w-64"
        } ${ready ? "" : "md:w-60"}`}
      aria-label="Main navigation"
      aria-expanded={!collapsed}
    >
      <div
        className={`border-b border-slate-100 ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}
      >
        <Link
          href="/"
          className={
            collapsed
              ? "flex items-center justify-center"
              : "flex flex-col items-start"
          }
          title={collapsed ? "Agent OS" : undefined}
        >
          {collapsed ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
              A
            </span>
          ) : (
            <>
              <p className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                Agent OS
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Luna Apps · Personal</p>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 app-section-label">
            Main
          </p>
        )}
        <ul className="space-y-0.5">
          {PRIMARY.map(({ href, label, match, Icon }) => (
            <li key={href}>
              <NavItem
                href={href}
                label={label}
                active={match(pathname)}
                Icon={Icon}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>

        {!collapsed && (
          <p className="mb-2 mt-6 px-3 app-section-label">
            Vault
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-slate-100" aria-hidden />}

        <ul className="space-y-0.5">
          <li>
            <NavItem
              href="/calendar"
              label="Calendar"
              active={pathname.startsWith("/calendar")}
              Icon={IconCalendar}
              collapsed={collapsed}
            />
          </li>
          <li>
            <NavItem
              href="/inbox"
              label="Inbox"
              active={pathname.startsWith("/inbox")}
              Icon={IconInbox}
              collapsed={collapsed}
            />
          </li>
          <li className={collapsed ? "" : "pt-1"}>
            <NavItem
              href="/browse/Projects"
              label="Browse"
              active={vaultActive}
              Icon={IconBrowse}
              collapsed={collapsed}
            />
          </li>
          {!collapsed &&
            VAULT_SECTIONS.map(({ href, label, dot }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-2 rounded-xl py-1.5 pl-11 pr-3 text-sm transition-colors ${pathname === href || pathname.startsWith(`${href}/`)
                      ? "font-medium text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                  {label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      <div className={`border-t border-slate-100 ${collapsed ? "p-2" : "p-4"}`}>
        {collapsed ? (
          <div
            className="flex justify-center py-1"
            title="VPS online"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-800">
              VPS online
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          className={`mt-3 flex w-full items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${collapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2.5 text-xs font-semibold"
            }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <CollapseIcon collapsed={collapsed} />
          <span className={collapsed ? "sr-only" : ""}>
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </button>
      </div>

      {/* Edge toggle — quick access on sidebar border */}
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-[4.5rem] z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 md:flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <CollapseIcon collapsed={collapsed} />
      </button>
    </aside>
  );
}
