"use client";

import AppNav from "@/components/AppNav";
import QuickPanel from "@/components/QuickPanel";
import { QuickPanelProvider } from "@/components/QuickPanelContext";
import DesktopSidebar from "@/components/DesktopSidebar";
import { SidebarProvider } from "@/components/SidebarContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <QuickPanelProvider>
        <div className="flex min-h-screen md:h-[100dvh] md:max-h-[100dvh] md:min-h-0 md:overflow-hidden">
          <DesktopSidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
          <QuickPanel />
        </div>
        <AppNav />
      </QuickPanelProvider>
    </SidebarProvider>
  );
}
