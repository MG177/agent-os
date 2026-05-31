# Agent OS

Personal Agent OS — unified mobile-first PWA for **PARA** and **nutrition**.

- **Vault hub:** `Obsidian/Projects/lumendev-personal-agent-os/`
- **Design system:** `Design System — Nutrition & PARA.html`
- **Agent guide:** `AGENTS.md`
- **Technical docs:** `docs/README.md`

## Quick start

```bash
cp .env.example .env.local
# VAULT_PATH=/Users/mg/Obsidian
# CURSOR_API_KEY=...        # required for /assistant (Cursor SDK)

npm install
npm run dev
```

http://localhost:3003

| Area | Entry |
|------|--------|
| PARA | `/` Capture · `/inbox` · `/browse/Projects` · WAHA → `POST /api/webhooks/whatsapp` |
| Nutrition | `/nutrition` |
| Assistant | `/assistant` |

## Related repos (legacy)

| Repo | Status |
|------|--------|
| [para-dashboard](https://github.com/MG177/para-dashboard) | Merged into this repo |
| [nutrition-tracker](https://github.com/MG177/nutrition-tracker) | Merged into this repo |

## Deploy (VPS)

Build image `agent-os:latest` (`docker compose build`), use `docker-compose.yml` (embedded MongoDB in the same container, Traefik `personal.lumen-dev.com`, port **3003**). Mount vault at `/root/PARA` and volume `agent-os-data` at `/var/lib/agent-os` (audit + Mongo `mongodb/`). Nutrition requires `MONGODB_URI`. Run `npm run migrate:nutrition` once if importing legacy JSON files. Vault git push/pull is **out of scope** — handled by an external sync system.
