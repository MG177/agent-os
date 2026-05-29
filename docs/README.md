# Agent OS — technical docs

Single PWA merging **para-dashboard** (PARA vault) and **nutrition-tracker** (macros + AI chat).

## Local development

```bash
cp .env.example .env.local
# VAULT_PATH=/Users/mg/Obsidian
# GEMINI_API_KEY=...   # for /nutrition/chat

npm install
npm run dev
```

http://localhost:3003

## Routes (wireframe IA)

Main mobile tabs: **Home · Capture · Nutrition · Activity** (see `Personal Agent OS Wireframes.html` + `Design System — Nutrition & PARA.html`).

| Route | Wireframe screen |
|-------|------------------|
| `/` | Home — command center |
| `/capture` | Quick note |
| `/capture/success` | Saved confirmation |
| `/nutrition` | Nutrition today |
| `/nutrition/log` | Log meal (Manual / Photo) |
| `/activity` | Audit + undo |
| `/calendar` | Google Calendar week view |
| `/settings/integrations` | Connect / disconnect Google Calendar |
| `/inbox`, `/browse/...` | Secondary (desktop nav) |

### APIs

| Route | Purpose |
|-------|---------|
| `POST /api/inbox` | Capture → `Inbox/` (Capture UI) |
| `POST /api/webhooks/whatsapp` | WAHA webhook → `Inbox/` (HMAC + allowlist) |
| `/api/home` | Home stats + recent activity |
| `/api/activity` | Full activity feed |
| `/api/nutrition/*` | Nutrition REST |
| `/api/chat` | Gemini streaming |
| `GET /api/integrations/google-calendar/status` | Calendar connection status |
| `GET /api/integrations/google-calendar/auth` | Start Google OAuth |
| `GET /api/integrations/google-calendar/callback` | OAuth callback |
| `DELETE /api/integrations/google-calendar` | Disconnect |
| `GET /api/calendar/events` | List events from **all account calendars** (`range=today\|week`, optional `refresh=1`) |

## Data paths

| Domain | Default path | Env override |
|--------|--------------|----------------|
| Vault (read + `Inbox/` write only) | `VAULT_PATH` | `/Users/mg/Obsidian` locally · `/root/PARA` in prod |
| Audit log | `~/.local/share/agent-os/audit.jsonl` | `AGENT_OS_DATA_PATH` |
| Nutrition (required) | MongoDB `nutrition-tracker` (`foods`, `meals`, `goals`) | `MONGODB_URI` |
| Google Calendar tokens | `$AGENT_OS_DATA/integrations/google-calendar.json` (encrypted) | `TOKEN_ENCRYPTION_KEY`, `GOOGLE_OAUTH_*`, `OAUTH_STATE_SECRET` |

Vault git push/pull is **out of scope** — an external sync system keeps `VAULT_PATH` in sync with the remote.

## Deploy (VPS)

- Domain: `personal.lumen-dev.com` (Traefik via `dokploy-network`)
- Compose: single `agent-os` service; embedded `mongod` via `docker-entrypoint.sh`; data under `/var/lib/agent-os/mongodb`
- `MONGODB_URI` required; default in compose: `mongodb://127.0.0.1:27017/nutrition-tracker`
- Host env required: `GEMINI_API_KEY`
- One-shot legacy import: `LEGACY_NUTRITION_IMPORT_DIR=... npm run migrate:nutrition`

## Legacy repos

- `para-dashboard` — superseded; browse + inbox patterns merged here
- `nutrition-tracker` — UI + API merged; keep repo until MongoDB cutover

## Status

Shipped:
- Capture UI PWA, `POST /api/inbox`, `Inbox/`-only write guard
- Audit log + 24h undo + `/activity` feed
- Read-only browse for vault sections
- Nutrition UI + Mongo-backed API + Gemini chat
- Dockerfile + docker-compose for VPS

Not yet implemented:
- VPS hardening / full production smoke on `personal.lumen-dev.com`

Shipped (2026-05-27):
- MongoDB nutrition store — `nutrition-mongo.ts`, `npm run migrate:nutrition`, embedded `mongod` in production image
- WhatsApp / WAHA → `POST /api/webhooks/whatsapp` — see vault runbook `runbook-whatsapp-inbox-capture`
- Google Calendar read-only — OAuth connect, `/calendar`, Home schedule card; vault runbook `runbook-google-calendar-connect`

## Design

`Design System — Nutrition & PARA.html` at repo root.
