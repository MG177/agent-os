import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import AppNav from "@/components/AppNav";
import AppShell from "@/components/AppShell";
import ParaShell from "@/components/ParaShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent OS",
  description: "Personal Agent OS — PARA capture and nutrition tracking",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Agent OS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 font-sans pb-20 md:pb-0">
        <AppShell>
          <ParaShell>{children}</ParaShell>
        </AppShell>
        <AppNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
