import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Cursor SDK ships native binaries + LICENSE.txt; keep it out of Turbopack bundle (Vercel build).
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
