import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  output: "standalone",
  // Cursor SDK ships native binaries + LICENSE.txt; keep it out of Turbopack bundle (Vercel build).
  serverExternalPackages: ["@cursor/sdk"],
};

// Treemap of route/chunk sizes: `npm run analyze` (sets ANALYZE=true). No-op otherwise.
const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default analyze(nextConfig);
