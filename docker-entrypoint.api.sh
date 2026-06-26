#!/bin/sh
set -e

# Audit log + integration token dir (shared agent-os-data volume with web).
mkdir -p "${AGENT_OS_DATA_PATH:-/var/lib/agent-os}"

# NestJS api via swc-node. exec so pnpm is PID 1 and forwards SIGTERM/SIGINT
# (clears the todo-notify interval via Nest shutdown hooks).
cd /app
exec pnpm --filter @agent-os/api start
