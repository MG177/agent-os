# Single-stage build for the pnpm/Turborepo monorepo. glibc (bookworm) so the
# Cursor SDK's prebuilt native binaries load at runtime (musl/Alpine breaks them).
# The assistant MCP child is spawned at runtime via `npx tsx` against raw
# packages/*/src, so we keep the full workspace (source + node_modules incl.
# devDeps like tsx) in the image rather than a pruned standalone output.
# Node 22 (matches the host) — pnpm 11.8.0 requires Node 22+.
FROM node:22-bookworm-slim AS app
WORKDIR /app

# CA certs for the MongoDB Atlas (mongodb+srv) TLS connection.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Install workspace deps. Copy manifests first so the install layer caches across
# source-only changes. allowBuilds (esbuild/sharp/unrs-resolver) is in pnpm-workspace.yaml.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/platform/package.json ./packages/platform/package.json
RUN pnpm install --frozen-lockfile

# Build the Next app (Turbopack). next build sets NODE_ENV=production itself.
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter agent-os build

ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
ENV HOME=/root
ENV AGENT_OS_DATA_PATH=/var/lib/agent-os
# Pin the app root so the MCP child resolves scripts/ + packages/ deterministically.
ENV AGENT_OS_APP_ROOT=/app/apps/web

RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 3003
ENTRYPOINT ["/app/docker-entrypoint.sh"]
