# Agent OS — technical docs

Single PWA merging **para-dashboard** (PARA vault) and **nutrition-tracker** (macros + AI chat).

## Local development

```bash
cp .env.example .env.local
# VAULT_PATH=/Users/mg/Obsidian
# CURSOR_API_KEY=...   # for /assistant (Cursor SDK, composer-2.5)

npm install
npm run dev
```

http://localhost:3003

## Deployments

| Target | Mode | Filesystem |
|--------|------|------------|
| VPS / Docker | `full` (default) | Writes `Inbox/`, `audit.jsonl` under `AGENT_OS_DATA` |
| Vercel (lite) | `lite` (auto when `VERCEL=1`) | Read-only — no capture, undo, or audit log; nutrition/calendar via MongoDB still work |

Set `AGENT_OS_DEPLOYMENT=full` on Vercel only if you add persistent storage and intend writes.

**Vercel Web Analytics & Speed Insights** — `@vercel/analytics` and `@vercel/speed-insights` are wired in `src/app/layout.tsx`. Enable both products for the Vercel project in the dashboard (Analytics → Web Analytics; Observability → Speed Insights).

## Routes (wireframe IA)

Main mobile tabs: **Home · Capture · Nutrition · Activity** (see `Personal Agent OS Wireframes.html` + `Design System — Nutrition & PARA.html`).

| Route | Wireframe screen |
|-------|------------------|
| `/` | Home — command center |
| `/capture` | Quick note |
| `/capture/success` | Saved confirmation |
| `/nutrition` | Nutrition today |
| `/nutrition/log` | Log meal (Manual / Photo) |
| `/assistant` | Multi-module AI assistant (nutrition, vault, calendar) |
| `/activity` | Audit + undo |
| `/calendar` | Google Calendar week view |
| `/settings/integrations` | Connect / disconnect Google Calendar |
| `/inbox`, `/browse/...` | Secondary (desktop nav) |

### Assistant stack

| Layer | Path |
|-------|------|
| Cursor SDK utils | `src/lib/cursor-sdk/` |
| Tool registry + runtime | `src/lib/assistant/` |
| MCP stdio server | `scripts/assistant-mcp-server.ts` |
| HTTP boundary | `POST /api/chat` |

Model default: `composer-2.5` (`CURSOR_ASSISTANT_MODEL`). Local Cursor agent + MCP tools calling domain libs (no direct vault writes outside `Inbox/`).

**Slash commands** (hybrid routing — hard = strict tools for writes, soft = prefer tools for reads):

| Command | Mode | Purpose |
|---------|------|---------|
| `/log-nutrition` | hard | Log meals, search/add foods, daily summary |
| `/nutrition-summary` | soft | Today's macros vs goals |
| `/capture` | hard | `capture_note` → Inbox only |
| `/inbox` | soft | List/read Inbox items |
| `/list-events` | soft | Calendar today or range (read-only) |
| `/vault-search` | soft | Search/read vault notes |
| `/recent-activity` | soft | Audit activity feed |
| `/general` | none | All tools (default) |

Type `/` in the assistant input for autocomplete. Optional `command` field on `POST /api/chat`.

Assistant chats persist in MongoDB (`assistant_sessions`, `assistant_messages`). Use **New chat** in the UI to start a fresh session; history lists prior threads. Images: max 5 per session, 500KB each.

### APIs

| Route | Purpose |
|-------|---------|
| `POST /api/inbox` | Capture → `Inbox/` (Capture UI) |
| `POST /api/webhooks/whatsapp` | WAHA webhook → `Inbox/` (HMAC + allowlist) |
| `/api/home` | Home stats + recent activity |
| `/api/activity` | Full activity feed |
| `/api/nutrition/*` | Nutrition REST |
| `GET/POST /api/assistant/sessions` | List / create assistant chat sessions |
| `GET/PATCH/DELETE /api/assistant/sessions/[id]` | Load messages, rename, delete session |
| `POST /api/chat` | Assistant turn: `{ sessionId, content, image?, command? }` (server loads history) |
| `GET /api/integrations/google-calendar/status` | Calendar connection status |
| `GET /api/integrations/google-calendar/auth` | Start Google OAuth |
| `GET /api/integrations/google-calendar/callback` | OAuth callback |
| `DELETE /api/integrations/google-calendar` | Disconnect |
| `GET /api/calendar/events` | List events from **all account calendars** (`range=today\|week`, optional `refresh=1`) |

## Deployment

Two targets with different feature sets.

### Vercel (current public deployment)

Point `MONGODB_URI` at MongoDB Atlas. All other env vars from `.env.example` apply normally.

| Feature | Works on Vercel |
|---------|----------------|
| Nutrition (`/nutrition/*`) | ✅ |
| ClickUp tasks (`/tasks`) | ✅ |
| Google Calendar (`/calendar`) | ✅ |
| Settings / integrations | ✅ |
| WhatsApp webhook endpoint | ✅ (WAHA must run elsewhere) |
| Vault browse (`/browse`) | ❌ requires `VAULT_PATH` on filesystem |
| Inbox capture (`/inbox`, `POST /api/inbox`) | ❌ writes to `VAULT_PATH/Inbox/` |
| Assistant chat (`/assistant`) | ❌ spawns local Cursor process |
| Activity feed | ❌ reads local `audit.jsonl` |

### Local dev (full features)

All features available. `VAULT_PATH` points at the local Obsidian checkout. `CURSOR_API_KEY` enables `/assistant`.

### VPS (deferred)

Original production target; not in use while VPS is down. Compose file and embedded-mongod image remain in repo for when it returns.

- Domain: `personal.lumen-dev.com` (Traefik via `dokploy-network`)
- Compose: single `agent-os` service; embedded `mongod` via `docker-entrypoint.sh`; data under `/var/lib/agent-os/mongodb`
- One-shot legacy import: `LEGACY_NUTRITION_IMPORT_DIR=... npm run migrate:nutrition`

## Data paths

| Domain | Storage | Env |
|--------|---------|-----|
| Vault (read + `Inbox/` write only) | Local filesystem | `VAULT_PATH` |
| Audit log | `~/.local/share/agent-os/audit.jsonl` | `AGENT_OS_DATA_PATH` |
| Nutrition | MongoDB (`foods`, `meals`, `goals`) | `MONGODB_URI` |
| Integration tokens (Google Calendar, ClickUp) | MongoDB `integrations` collection (encrypted at rest) | `TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET` |

Vault git push/pull is **out of scope** — an external sync system keeps `VAULT_PATH` in sync with the remote.

## Legacy repos

- `para-dashboard` — superseded; browse + inbox patterns merged here
- `nutrition-tracker` — UI + API merged; keep repo until MongoDB cutover

## Status

Shipped:
- Capture UI PWA, `POST /api/inbox`, `Inbox/`-only write guard
- Audit log + 24h undo + `/activity` feed
- Read-only browse for vault sections
- Nutrition UI + Mongo-backed API + Cursor SDK assistant (`/assistant`)
- Dockerfile + docker-compose for VPS

Not yet implemented:
- VPS hardening / full production smoke on `personal.lumen-dev.com`

Shipped (2026-05-27):
- MongoDB nutrition store — `nutrition-mongo.ts`, `npm run migrate:nutrition`, embedded `mongod` in production image
- WhatsApp / WAHA → `POST /api/webhooks/whatsapp` — see vault runbook `runbook-whatsapp-inbox-capture`
- Google Calendar read-only — OAuth connect, `/calendar`, Home schedule card; vault runbook `runbook-google-calendar-connect`

## Design

`Design System — Nutrition & PARA.html` at repo root.
