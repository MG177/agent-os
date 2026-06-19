"use client";

import { usePathname } from "next/navigation";
import AppNav from "@/components/AppNav";
import QuickPanel from "@/components/QuickPanel";
import { QuickPanelProvider } from "@/components/QuickPanelContext";
import { AssistantSessionProvider } from "@/components/assistant/AssistantSessionContext";
import DesktopSidebar from "@/components/DesktopSidebar";
import { SidebarProvider } from "@/components/SidebarContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/dev-lock") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AssistantSessionProvider>
        <QuickPanelProvider>
          <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden">
            <DesktopSidebar />
            <main className="app-main-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
              {children}
            </main>
            <QuickPanel />
          </div>
          <AppNav />
        </QuickPanelProvider>
      </AssistantSessionProvider>
    </SidebarProvider>
  );
}
