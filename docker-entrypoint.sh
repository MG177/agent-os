#!/bin/sh
set -e

# Audit log + integration token dir. MongoDB is external (Atlas) — no embedded mongod.
mkdir -p "${AGENT_OS_DATA_PATH:-/var/lib/agent-os}"

# `next start` for apps/web (port 3003 via its package script). exec so pnpm is
# PID 1 and forwards SIGTERM/SIGINT to Next for graceful shutdown.
cd /app
exec pnpm --filter agent-os start
