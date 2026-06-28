# Design system — Luna Apps

The single source of truth is **`apps/web/src/app/globals.css`** (tokens) plus the
shadcn primitives in `apps/web/src/components/ui/`. This doc is the human-readable
summary; the CSS is authoritative. Mirror tokens, never hardcode brand values.

- **Brand:** Luna Apps — shared visual language for Nutrition + PARA surfaces.
- **Stack:** Next.js 16 · Tailwind 4 · Geist · `lucide-react` icons (stroke 1.8;
  shared set in `components/ui/icons.tsx`).
- **Mode:** light only (the `.dark` block in `globals.css` is unused).

## Color

One desaturated blue accent, one slate neutral ramp. The accent has a **single
source of truth** — `--primary` in `globals.css` — surfaced through semantic
utilities. **Never hardcode `bg-blue-600` / `text-blue-700` / `ring-blue-500`.**

| Need | Use | Not |
|---|---|---|
| Solid accent fill (buttons, FAB, active) | `bg-primary` + `text-primary-foreground` | `bg-blue-600 text-white` |
| Accent hover (darken) | `hover:bg-[var(--color-primary-hover)]` | `hover:bg-blue-700` |
| Accent text / link / icon | `text-primary` | `text-blue-600` |
| Subtle accent tint (chips, active row) | `bg-accent` (or `bg-primary-light`) | `bg-blue-50` |
| Accent border | `border-primary/30` (light) · `border-primary` (strong) | `border-blue-200` |
| Focus ring | `ring-ring` | `ring-blue-500` |

**Categorical / state colors** stay as Tailwind literals (they encode meaning, not
brand): `emerald` (success), `amber` (warning/reverted), `rose`/`red` (danger),
`violet` (recurrence / tool-call / WhatsApp), `sky`+`cyan` (two of the 6 calendar
category colors in `calendar-utils.ts`). One accent only — don't introduce a second
brand color.

## Elevation

Soft, slate-tinted shadows defined once in `globals.css` `@theme`
(`--shadow-sm/md/lg`), which override Tailwind's defaults. Use `shadow-sm` /
`shadow-md` / `shadow-lg`. **Never colored glow shadows** (`shadow-blue-200`,
`shadow-indigo-200/60`, …) and **no violet→blue brand gradients** — brand marks are
solid `bg-primary`.

## Shape (radius scale)

| Surface | Radius |
|---|---|
| Pills, chips, round avatars, toggles | `rounded-full` |
| Buttons, inputs, small controls | `rounded-lg` (`button.tsx` is canonical) |
| Inner tiles, list items, default cards | `rounded-2xl` |
| Primary cards, hero, side panels, modals/sheets | `rounded-3xl` |
| Tiny tags / badges | `rounded-md` |

`rounded-xl` is retired (it blurred the inner/primary tiers).

## Layout & density

Use the layout kit, don't hand-roll widths/grids — `Page` / `PageHeader` /
`PageBody` / `Grid` / `Stack` / `Widget` from `@/components/ui/layout`. Density and
column rules live in [`layout-system.md`](./layout-system.md) and in CLAUDE.md.

## Guard

`apps/web/scripts/check-design-tokens.sh` fails CI/local if blue/indigo literals,
colored glow shadows, or brand gradients reappear. Run it after UI changes.
