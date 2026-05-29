# Personal Agent OS — agent guide

Operational guide for coding agents working in this repository.

## Vault hub

- **Project:** `lumendev-personal-agent-os`
- **Hub:** `/Users/mg/Obsidian/Projects/lumendev-personal-agent-os/lumendev-personal-agent-os.md`
- **Area:** LumenDev (`area: lumendev`)

Load vault skills when editing vault-side artifacts: `vault-projects`, `project-docs-sync`, `vault-backlog-lifecycle`.

## Architecture (accepted)

- **Single PWA** in this repo — Capture UI + nutrition UI (phased).
- **PARA satellite** on VPS — full vault read, `Inbox/` write only; direct write + 24h undo.
- **nutrition-tracker** — domain backend at `/Users/mg/Project/nutrition-tracker` until UI fully migrates here.

See vault ADR: `Projects/lumendev-personal-agent-os/decisions/adr-2026-05-26-agent-os-boundaries.md`.

## Design system

UI work must follow **`Design System — Nutrition & PARA.html`** (repo root). Open in a browser for live reference.

- **Brand:** Luna Apps · shared visual language for Nutrition + PARA surfaces
- **Stack:** Next.js 16 · Tailwind 4 · Geist · inline SVG icons (stroke 1.8)
- **Tokens:** slate-50 background, slate-900 foreground, blue-600 primary, violet→blue hero gradients, `rounded-3xl` cards
- **Modes:** light only (no dark theme)
- **Sections:** foundations, color scales, typography, spacing/radius/elevation, components, app-specific patterns (meal rows, macro bars, inbox rows, vault sidebar), full-page mockups

Extracted from `nutrition-tracker` and `para-dashboard` — mirror `globals.css` and Tailwind classes when implementing components.

## Local dev

```bash
cp .env.example .env.local   # VAULT_PATH=/Users/mg/Obsidian
npm install && npm run dev   # http://localhost:3003
```

Routes: `/` Home · `/capture` · `/calendar` · `/settings/integrations` · `/inbox` · `/browse/...` (read-only) · `/nutrition/*` · `POST /api/inbox` · `POST /api/webhooks/whatsapp` (WAHA, HMAC) → `Inbox/` only · `GET /api/calendar/events` (Google read-only). Nutrition: **MongoDB required** (`MONGODB_URI`); calendar tokens live under `AGENT_OS_DATA/integrations/` (not Mongo). See vault runbook `runbook-google-calendar-connect`.

## Doc sync

When code changes materially, update vault artifacts per `project-docs-sync` (ADR, changelog, backlog, hub `Recent Changes`).

Technical markdown: repo `docs/README.md`; vault `context/` holds narrative only.

## Constraints

- Do not run `eslint` or full production builds unless explicitly requested.
- Scoped vault writes: agents must not write outside `Inbox/` on the PARA satellite path.
- Solo-user MVP — no multi-tenant or approval-queue patterns.
