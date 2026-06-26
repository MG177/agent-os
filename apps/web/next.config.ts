import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Run via `next start` in the container (not standalone): the assistant MCP
  // child needs the full node_modules + raw packages/*/src anyway, so standalone's
  // pruning gives no benefit and complicates the monorepo layout.
  // Workspace packages ship raw TS; Next must transpile them like local src/.
  transpilePackages: ["@agent-os/contracts", "@agent-os/core", "@agent-os/platform"],
  // Cursor SDK ships native binaries + LICENSE.txt; keep it out of Turbopack bundle (Vercel build).
  serverExternalPackages: ["@cursor/sdk"],
};

// Treemap of route/chunk sizes: `npm run analyze` (sets ANALYZE=true). No-op otherwise.
const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default analyze(nextConfig);
