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
- **Stack:** Next.js 16 · Tailwind 4 · Geist · [`lucide-react`](https://lucide.dev/icons/) icons (stroke 1.8). Shared icon set in `src/components/ui/icons.tsx`; import other glyphs directly from `lucide-react`.
- **Tokens:** slate-50 background, slate-900 foreground, blue-600 primary, violet→blue hero gradients, `rounded-3xl` cards
- **Modes:** light only (no dark theme)
- **Sections:** foundations, color scales, typography, spacing/radius/elevation, components, app-specific patterns (meal rows, macro bars, inbox rows, vault sidebar), full-page mockups

Extracted from `nutrition-tracker` and `para-dashboard` — mirror `globals.css` and Tailwind classes when implementing components.

## Layout & density

Every screen must earn its space: favor information density and **use the full viewport on large / high-res displays**. These rules apply to *all* pages, not just Home — when adding or editing any screen, follow them.

- **Container width.** Standard screens use `.app-screen` (`max-w-2xl` on mobile → fluid from `md`). Glance/dashboard-style screens add `.app-screen-home`, which scales `lg:max-w-7xl 2xl:max-w-[1600px]`. Never cap a content-rich screen at a fixed narrow width on wide monitors — let columns grow or add columns.
- **Progressive columns.** Ladder up, don't stay static: 1 col (mobile) → 2 col (`md`/`lg`) → add a 3rd column or more tiles at `xl`/`2xl` (`xl:grid-cols-3`, `2xl:grid-cols-4`, `auto-rows-fr`). No large dead horizontal bands.
- **Compact spacing.** Section gaps `gap-4` (mobile) → `md:gap-5`/`gap-6` max. Card padding `p-4` → `md:p-5`/`p-6` (avoid `p-8`). Inter-section `space-y-4`. List rows `py-2.5`.
- **Type scale.** Hero numbers cap at `md:text-4xl` (avoid `text-5xl`); body `text-sm`; labels `text-xs`/`text-[10px]`. Bigger ≠ better on a glance surface.
- **One encoding per metric.** Show a value once (ring *or* bar *or* number), never the same number three ways.
- **Fill vertical room.** Scrollable lists (schedule, activity, agenda) raise `max-h` on `lg`+ and reveal more rows instead of truncating to "+N more".
- **Radius.** Keep `rounded-3xl` for hero / primary cards (per design system); inner/secondary tiles use `rounded-2xl`.

**Layout kit (required for new pages).** Use `src/components/ui/layout/` — `<Page variant="dashboard|list|read|form">`, `<PageHeader>`, `<PageBody>`, `<Grid cols={2|3|4|"auto"}>`, `<Stack>`, `<Widget>`. See `docs/layout-system.md`. Don't hand-roll `app-screen-inset`, `max-w-6xl`, or grid breakpoints.

Reuse the `globals.css` primitives (`.app-screen`, `.app-card`, `.app-hero`) via the layout kit — don't copy width/padding class chains.

## Local dev

```bash
cp .env.example .env.local   # VAULT_PATH=/Users/mg/Obsidian
npm install && npm run dev   # http://localhost:3003
```

Routes: `/` Home · `/assistant` · `/assistant/[sessionId]` (Cursor SDK + MCP tools, Mongo session history) · `/capture` · `/calendar` · `/settings/integrations` · `/inbox` · `/browse/...` (read-only) · `/nutrition/*` · `POST /api/inbox` · `POST /api/chat` · `/api/assistant/sessions` · `POST /api/webhooks/whatsapp` (WAHA, HMAC) → `Inbox/` only · `GET /api/calendar/events` (Google read-only). Assistant: **`CURSOR_API_KEY`**, model **`composer-2.5`** (`CURSOR_ASSISTANT_MODEL`). Nutrition + assistant sessions: **MongoDB required** (`MONGODB_URI`); calendar tokens live under `AGENT_OS_DATA/integrations/` (not Mongo). See vault runbook `runbook-google-calendar-connect`.

## Doc sync

When code changes materially, update vault artifacts per `project-docs-sync` (ADR, changelog, backlog, hub `Recent Changes`).

Technical markdown: repo `docs/README.md`; vault `context/` holds narrative only.

## Constraints

- Do not run `eslint` or full production builds unless explicitly requested.
- Scoped vault writes: agents must not write outside `Inbox/` on the PARA satellite path.
- Solo-user MVP — no multi-tenant or approval-queue patterns.

## Cursor Cloud specific instructions

### Minimal local stack (Cloud VM)

1. **MongoDB** — not bundled in the repo. Start a local `mongod` (systemd may be unavailable in Cloud VMs):

   ```bash
   mkdir -p /tmp/mongodb-data
   mongod --dbpath /tmp/mongodb-data --bind_ip 127.0.0.1 --port 27017 --fork --logpath /tmp/mongod.log
   ```

2. **`.env.local`** — copy from `.env.example` and set at least:

   - `VAULT_PATH=/workspace/.dev-vault` (create `Inbox/`, `Projects/`, `Areas/`, `Resources/`, `Ideas/` under it)
   - `MONGODB_URI=mongodb://127.0.0.1:27017/nutrition-tracker`
   - `AGENT_OS_DATA_PATH=/workspace/.agent-os-data` (optional; audit log)

3. **Dev server** — `npm run dev` → http://localhost:3003 (see `package.json`; not port 3000).

### Services

| Service | Required for | Notes |
|---------|----------------|-------|
| Next.js (`npm run dev`) | All UI/API | Port **3003** |
| MongoDB | Nutrition + integration tokens + `/api/home` | `MONGODB_URI` mandatory |
| PARA vault dir | Capture, browse, inbox | Writable **`Inbox/`** only for agents |
| Cursor API | `/assistant`, `POST /api/chat` | `CURSOR_API_KEY` — optional for PARA/nutrition smoke |
| Google / ClickUp / WAHA | Integrations routes | Optional; connect via Settings or env |

### Verify without a full Obsidian vault

```bash
curl -s -X POST http://localhost:3003/api/inbox -H 'Content-Type: application/json' \
  -d '{"title":"Smoke","body":"test","source":"capture-ui"}'
curl -s http://localhost:3003/api/home | jq '.status, .capturesToday, .mealsToday'
```

### Lint / tests

- No ESLint config or `npm test` script in this repo.
- Typecheck: `npx tsc --noEmit`.
- WhatsApp webhook smoke: `node scripts/waha-webhook-smoke.mjs` (needs `WAHA_WEBHOOK_SECRET` in `.env.local`).

### Gotchas

- **Timezone:** defaults to `Asia/Jakarta` for “today” in nutrition and home stats (`TZ` in `.env.example`).
- **Mongo in Docker:** production image starts embedded `mongod` via `docker-entrypoint.sh`; local Cloud dev uses a separate `mongod` process as above.
- **Assistant:** requires outbound network + `CURSOR_API_KEY`; MCP child is `npx tsx scripts/assistant-mcp-server.ts`.
