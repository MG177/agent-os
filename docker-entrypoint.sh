#!/bin/sh
set -e

AGENT_OS_DATA="${AGENT_OS_DATA_PATH:-/var/lib/agent-os}"
MONGO_DBPATH="${MONGO_DBPATH:-$AGENT_OS_DATA/mongodb}"
mkdir -p "$AGENT_OS_DATA" "$MONGO_DBPATH"

should_run_embedded_mongo() {
  case "${EMBEDDED_MONGO:-auto}" in
    0|false|no) return 1 ;;
    1|true|yes) return 0 ;;
    auto)
      uri="${MONGODB_URI:-mongodb://127.0.0.1:27017/nutrition-tracker}"
      case "$uri" in
        mongodb://127.0.0.1:*|mongodb://localhost:*) return 0 ;;
        *) return 1 ;;
      esac
      ;;
    *) return 1 ;;
  esac
}

start_embedded_mongo() {
  echo "[entrypoint] starting embedded mongod at $MONGO_DBPATH"
  mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port 27017 --fork --logpath /tmp/mongod.log
  i=0
  while [ "$i" -lt 60 ]; do
    if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
      echo "[entrypoint] mongod ready"
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "[entrypoint] mongod failed to become ready" >&2
  exit 1
}

stop_embedded_mongo() {
  mongosh --eval "db.adminCommand({ shutdown: 1 })" --quiet >/dev/null 2>&1 || true
}

export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/nutrition-tracker}"

if should_run_embedded_mongo; then
  start_embedded_mongo
else
  echo "[entrypoint] skipping embedded mongod (external MONGODB_URI)"
fi

node server.js &
NODE_PID=$!

shutdown() {
  kill "$NODE_PID" 2>/dev/null || true
  wait "$NODE_PID" 2>/dev/null || true
  if should_run_embedded_mongo; then
    stop_embedded_mongo
  fi
}
trap shutdown TERM INT

wait "$NODE_PID"
