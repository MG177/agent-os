[Home](./README.md) > Layout system

## Overview

Agent OS pages use a thin **layout kit** in `src/components/ui/layout/` so width, header rhythm, section gap, and responsive columns are correct by default. CSS primitives in `src/app/globals.css` remain the source of truth; React components compose them.

**Key points:**

- Pick a `<Page variant>` once — don't hand-type `app-screen*` or `max-w-6xl` chains.
- Pair `<PageHeader>` + `<PageBody>` for dashboard/list screens.
- Drop widgets into `<Grid cols={…}>` for the progressive-columns ladder.
- Use `<Widget>` for standard dashboard tiles.

## Page scaffold

```tsx
import { Page, PageBody } from "@/components/ui/layout";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ExamplePage() {
  return (
    <Page variant="dashboard">
      <PageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold md:text-2xl">Title</h1>
        </div>
      </PageHeader>
      <PageBody>{/* sections */}</PageBody>
    </Page>
  );
}
```

### Variants

| Variant | CSS | Use for |
|---------|-----|---------|
| `dashboard` | `app-screen app-screen-home` | Home, calendar, tasks, nutrition, assistant |
| `list` | `app-screen app-screen-wide` | Activity, wide list screens |
| `read` | `app-screen app-screen-read` | Inbox note detail, reading width |
| `form` | `app-screen max-w-lg` | Settings / integrations |

### Props

| Component | Prop | Default | Notes |
|-----------|------|---------|-------|
| `Page` | `scroll` | `"page"` | `"inner"` → `md:overflow-hidden` (nutrition, tasks) |
| `Page` | `fill` | per variant | Dashboard fills column; list/read/form don't |
| `PageHeader` | `inset` | `true` | `false` for custom toolbars (nutrition header) |
| `PageHeader` | `insetClassName` | — | Extra layout on inset row (calendar header) |
| `PageBody` | `fill` | `false` | Stretch body for inner-scroll grids |
| `PageBody` | `gap` | `true` | `false` when content owns spacing |
| `PageBody` | `inset` | `true` | `false` on read/form where `<Page>` owns padding |
| `PageBody` | `direction` | `"col"` | `"row"` for sidebar + main (tasks) |

## Grid

```tsx
import { Grid } from "@/components/ui/layout";

<Grid cols="auto">{/* tiles */}</Grid>
<Grid cols={3} className="lg:grid-cols-2">{/* home-style 2→3 ladder */}</Grid>
```

| `cols` | Breakpoints |
|--------|-------------|
| `2` | 1 → `md:2` |
| `3` | 1 → `md:2` → `xl:3` |
| `4` / `"auto"` | 1 → `md:2` → `xl:3` → `2xl:4` |

All presets include `gap-4 md:gap-5`, `auto-rows-fr`, `items-stretch`. Override breakpoints via `className`.

## Stack & Widget

```tsx
import { Stack, Widget } from "@/components/ui/layout";

<Stack gap="section">{/* vertical sections */}</Stack>
<Widget title="Today" action={<button>…</button>}>{content}</Widget>
```

## CSS tokens

Defined in `@theme inline` and `.app-page-*` classes in `globals.css`:

- Section gap: `--spacing-section-gap` (`gap-4`) → `md:gap-5` / `gap-6`
- Card padding: `--spacing-card-padding`
- List row: `--spacing-list-row-py` (`py-2.5`)
- Content max widths: `--size-content-wide` (6xl), `--size-content-ultra` (7xl), `--size-content-2xl` (1600px)

**Tailwind v4 note:** `@apply` only works with utility classes — not other custom classes (e.g. do not `@apply app-screen-inset`; inline the utilities instead).

## When to bypass

- **Browse column browser** — full-bleed Finder-style chrome; hub page uses `<Page>` + `<PageBody>` only.
- **Custom bento grids** (home schedule/tasks) — use `<Grid>` with `className` overrides for `col-span` / `row-span`.
- **QuickPanel / modals** — not page-level; stay self-contained.

## Related

- ADR: vault `decisions/adr-2026-06-04-layout-system-standardization.md`
- Design reference: `Design System — Nutrition & PARA.html` (repo root)
- Agent guides: `CLAUDE.md` / `AGENTS.md` § Layout & density

---

**Document Length:** ~120 lines | **Last Updated:** 2026-06-04
