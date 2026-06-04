# Performance budget

Ratified budget for the daily-driver routes, plus how to measure locally and in CI. This closes the hub open decision *"Mobile perf budget — LCP/TTI targets"* (see the [perf & UX overhaul epic](../README.md)).

## Budget (mid-tier mobile, throttled)

Targets apply to the routes the owner opens daily: `/`, `/tasks`, `/nutrition`, `/calendar`.

| Metric | Target | Notes |
| ------ | ------ | ----- |
| **LCP** (Largest Contentful Paint) | ≤ 2.0 s | hero / first card visible |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | field metric (Vercel Speed Insights) |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | skeletons must reserve final height |
| **Route re-visit (cached)** | content < 200 ms, no spinner | served from the SWR snapshot (Lane A) |
| **Initial route JS** | ≤ ~200 KB gzip | per route |
| **Single non-lazy interactive chunk** | ≤ 120 KB | else `next/dynamic` it (Lane G) |

Lighthouse runs in the lab and cannot measure INP directly; it uses **Total Blocking Time (TBT ≤ 300 ms)** as the proxy. INP is tracked in the field via Vercel Speed Insights.

## What's enforced where

- **CI (Lighthouse):** `.lighthouserc.json` + the `lighthouse` job in `.github/workflows/ci.yml`. Runs on pull requests against a production build of `/`. **Currently warn-only and `continue-on-error`** so it reports without blocking. Flip to enforce once the budget is validated against a few real runs (see below).
- **Field (Web Vitals):** `@vercel/analytics` + `@vercel/speed-insights` in `src/app/layout.tsx` collect LCP/INP/CLS/TTFB from real sessions on Vercel.
- **Bundle size:** `npm run analyze` produces a treemap; record per-route JS below and compare before/after Lanes G/D/E.

## How to read it / run it locally

### Bundle treemap

```bash
npm run analyze          # = ANALYZE=true next build
```

Opens client/server/edge treemaps in the browser. Use it to spot heavy chunks (calendar grid, assistant chat, food workspace, markdown/mermaid) that Lane G should code-split.

### Local Lighthouse

```bash
npm run build
npm run start            # serve the production build on :3003
# in another shell:
npx @lhci/cli@0.16.x autorun
```

The lock must be **inactive** (no `DEV_PREVIEW_PASSWORD` in env) so the collector can reach the routes. Report URL is printed at the end (temporary public storage).

### Field data

Vercel project → **Speed Insights** and **Analytics** tabs. This is the source of truth for INP and real-world LCP/CLS; the lab budget above is the guardrail that keeps PRs from regressing it.

## Baseline

> Capture the first real numbers here (`npm run analyze` per-route JS + one Lighthouse run on `/`) so Lanes G/D/E gains are measurable. Left intentionally blank until a clean production build is run.

| Route | Initial JS (gzip) | LCP | TBT | CLS | Date |
| ----- | ----------------- | --- | --- | --- | ---- |
| `/` | _tbd_ | _tbd_ | _tbd_ | _tbd_ | — |
| `/tasks` | _tbd_ | _tbd_ | _tbd_ | _tbd_ | — |
| `/nutrition` | _tbd_ | _tbd_ | _tbd_ | _tbd_ | — |
| `/calendar` | _tbd_ | _tbd_ | _tbd_ | _tbd_ | — |

## Enforcing (later)

When the baseline is filled and stable:

1. In `.lighthouserc.json`, change the relevant assertions from `"warn"` to `"error"`.
2. Remove `continue-on-error: true` from the `lighthouse` job.
3. Add the other routes to `collect.url` once they boot reliably in CI without live integrations.
