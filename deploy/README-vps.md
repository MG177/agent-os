# Hosting agent-os on the lumen-dev VPS (nginx → Caddy)

Files in this deploy:
- `../docker-compose.vps.yml` — self-contained compose for this box (no Dokploy/Traefik).
- `../.env` — secrets + config (chmod 600, git-ignored). **Fill the two `CHANGEME_` values.**
- `./Caddyfile` — edge proxy replacing nginx (auto-HTTPS + `basic_auth` gate).

Code changes that make this work (already applied on branch `host-agent-os-vps`):
- `src/lib/cursor-sdk/client.ts` — `settingSources: ["user","project"]` + project root = vault.
- `src/lib/cursor-sdk/config.ts` — MCP child decoupled from the agent cwd (runs from app root,
  absolute `--tsconfig`).
- `Dockerfile` — copies `scripts/`, `src/`, `tsconfig.json`, full `node_modules` so the assistant
  MCP child (`npx tsx`) runs in the container.

## 0. Prereqs
- DNS `agent-os.lumen-dev.com` A-record → this VPS IP.
- In `../.env` set `CURSOR_API_KEY` (Cursor Dashboard → Integrations) and `WHATSAPP_ALLOWED_JIDS`
  (your `628…@c.us`). Optionally `GOOGLE_OAUTH_CLIENT_ID/SECRET`.

## 1. Build + run the app (localhost only)
```bash
cd /home/mg177/agent-os
docker compose -f docker-compose.vps.yml build
docker compose -f docker-compose.vps.yml up -d
docker compose -f docker-compose.vps.yml logs -f agent-os   # expect "[entrypoint] mongod ready"
curl -sSI http://127.0.0.1:1777/                            # 200 → container serves
```

## 2. Cut the edge over to Caddy  ⚠️ briefly disrupts waha/n8n
```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Gate password → bcrypt hash; paste it into deploy/Caddyfile (replace CHANGEME_…)
caddy hash-password --plaintext 'YOUR_PASSWORD'

# Install config + cut over (frees 80/443 from nginx)
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl stop nginx && sudo systemctl disable nginx
sudo systemctl restart caddy
sudo journalctl -u caddy -f          # watch ACME issue 4 certs
```
Rollback: `sudo systemctl stop caddy && sudo systemctl enable --now nginx`
(the nginx vhosts are left in place, just disabled).

## 3. Wire the WhatsApp webhook (waha-lumen @ waha.lumen-dev.com)
```bash
set -a; . /home/mg177/agent-os/.env; set +a
curl -sS -X POST https://waha.lumen-dev.com/api/sessions/default \
  -H "X-Api-Key: $WAHA_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"default","config":{"webhooks":[{"url":"https://agent-os.lumen-dev.com/api/webhooks/whatsapp","events":["message"],"hmac":{"key":"'"$WAHA_WEBHOOK_SECRET"'"}}]}}'
```
(If session `default` already exists, use the update endpoint instead of create.)

## 4. Verify (end-to-end)
1. `curl -sSI https://agent-os.lumen-dev.com/` → 401; `-u mg:YOUR_PASSWORD` → 200.
2. `/assistant`: ask something that hits a PARA convention → reply reflects vault rules; logs show
   `[cursor-sdk] … status=…`, no `assistant-mcp-server failed`.
3. WhatsApp from your allowed JID → new file in `PARA/Inbox/` + ACK reply.
4. Settings → Integrations: connect Google Calendar / paste ClickUp `pk_` token.
