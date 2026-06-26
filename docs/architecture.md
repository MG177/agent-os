# Architecture

Agent OS is a pnpm + Turborepo monorepo. Two apps (`web`, `api`) sit on three
shared package layers (`contracts` → `core` → `platform`). The assistant runs
behind a swappable **MCP seam**, and the whole thing ships in two modes: a
stateless **lite** build on Vercel that proxies stateful work to a **full**
instance on a VPS.

> Editable source: [`architecture.drawio`](./architecture.drawio) — open in
> [draw.io](https://app.diagrams.net) (3 tabs: Deployment, Agent seam,
> Packages). The Mermaid below mirrors it for inline GitHub viewing; keep the
> two in sync when you edit.

## Deployment (lite ↔ full)

Lite (Vercel) serves stateless routes everywhere and proxies stateful routes to
the full VPS instance when `FULL_INSTANCE_URL` is set.

```mermaid
flowchart TB
  client["Client (browser PWA / WhatsApp)"]
  waha["WAHA (WhatsApp)<br/>inbound webhook + API out"]

  subgraph vercel["Vercel — lite mode (apps/web, Next.js 16)"]
    stateless["Stateless routes (run everywhere):<br/>/api/home, /api/calendar/events,<br/>/api/todos, /api/assistant/sessions"]
    stateful["Stateful routes (proxied when FULL_INSTANCE_URL set):<br/>/api/inbox, /api/chat, /api/browse,<br/>/api/webhooks/whatsapp, /api/activity"]
  end

  subgraph vps["VPS — full mode (Docker Compose)"]
    caddy["Caddy reverse proxy :1777"]
    fullweb["agent-os web (lite)"]
    api["agent-os-api (NestJS :3004)"]
  end

  mongo[("MongoDB Atlas")]
  vault[("FS vault (PARA dirs)")]
  gcal["Google Calendar (OAuth read-only)"]
  clickup["ClickUp (OAuth / PAT)"]

  client --> stateless
  waha --> stateful
  stateful -->|"proxy → FULL_INSTANCE_URL (+ optional Basic auth)"| caddy
  caddy --> fullweb --> api
  api --> mongo
  api --> vault
  api --> gcal
  api --> clickup
```

## Agent seam (pluggable providers behind MCP)

`runtime.ts` resolves the request, then `provider-factory.ts` picks a provider
by `ASSISTANT_PROVIDER`. The `cursor` and `claude` providers each spawn a
**stdio MCP child** exposing the assistant's tools; `http` talks to a plain
OpenAI-compatible endpoint with no tool-calling. The MCP boundary is the
swappable seam (a future Hermes provider slots in here).

```mermaid
flowchart TB
  controller["apps/api assistant.controller<br/>(REST /chat, sessions)"]
  runtime["runtime.ts — runAssistantChat<br/>(validate, resolve commands, persist)"]
  factory["provider-factory.ts<br/>select by ASSISTANT_PROVIDER"]
  mongo[("MongoDB<br/>assistant_sessions / messages")]

  cursor["cursor-sdk (default)<br/>CURSOR_API_KEY"]
  claude["claude-agent-sdk<br/>ANTHROPIC_API_KEY"]
  http["http-provider<br/>OpenAI-compatible (no MCP)"]
  cloud["LLM cloud APIs:<br/>Cursor / Anthropic / custom HTTP"]

  subgraph seam["MCP seam — swappable (Hermes = future)"]
    child["stdio MCP child<br/>assistant-mcp-server.ts → platform mcp/server.ts"]
    registry["tool-registry.ts — executeAssistantTool()"]
    nutrition["nutrition"]
    vaulttool["vault (Inbox write only)"]
    cal["calendar (read-only)"]
    activity["activity (audit)"]
  end

  controller --> runtime --> factory
  runtime -->|persist| mongo
  factory --> cursor
  factory --> claude
  factory --> http
  cursor -.-> cloud
  claude -.-> cloud
  http -.-> cloud
  cursor -->|spawn| child
  claude -->|spawn| child
  child --> registry
  registry --> nutrition
  registry --> vaulttool
  registry --> cal
  registry --> activity
```

## Package layering

`contracts` and `core` are isomorphic (browser + node). `platform` is node-only
I/O — **`apps/web` must never import it**; only `apps/api` may. Arrows point in
the import (depends-on) direction.

```mermaid
flowchart TB
  web["apps/web (browser + node)"]
  api["apps/api (node)"]
  contracts["@agent-os/contracts<br/>Zod schemas + types — isomorphic"]
  core["@agent-os/core<br/>pure logic, no I/O — isomorphic"]
  platform["@agent-os/platform<br/>FS, Mongo, Google, MCP + agent SDKs — node only"]

  core --> contracts
  platform --> contracts
  platform --> core
  web --> contracts
  web --> core
  api --> contracts
  api --> core
  api --> platform
  web -. "✗ must NOT import" .-> platform
```
