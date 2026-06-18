# Build in glibc (matches the bookworm-slim runner) so native modules — e.g. the
# Cursor SDK's prebuilt binaries — load at runtime. Alpine/musl here caused
# `libc.musl-x86_64.so.1: cannot open shared object file` on the glibc runner.
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Bump V8 heap — next build OOMs at the ~1GB default on this small box.
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
ENV HOME=/root
ENV AGENT_OS_DATA_PATH=/var/lib/agent-os
ENV MONGO_DBPATH=/var/lib/agent-os/mongodb
ENV MONGODB_URI=mongodb://127.0.0.1:27017/nutrition-tracker
ENV EMBEDDED_MONGO=auto

# MongoDB lives in Atlas now (shared with Vercel) — no embedded mongod.
# Only need CA certs for the mongodb+srv (TLS) connection.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# The assistant MCP child is spawned at runtime via `npx tsx scripts/assistant-mcp-server.ts`.
# Next.js standalone output prunes scripts/, raw src/, tsconfig.json and the tsx dependency,
# so copy them (plus full node_modules for tsx import resolution) back into the runner.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3003
ENTRYPOINT ["/app/docker-entrypoint.sh"]
