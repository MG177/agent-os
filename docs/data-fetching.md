# Data fetching & client cache

## Overview

All client-side data fetching goes through `src/lib/data/useResource.ts`, a thin SWR wrapper that adds a `localStorage` snapshot for instant paint on revisit.

## Hook contract

```ts
import { useResource, mutate } from "@/lib/data/useResource";
import { KEYS } from "@/lib/data/keys";

const { data, error, isLoading, isValidating, mutate } = useResource<T>(key, fetcher?, config?);
```

- **`key`** — string (or `null` to skip). Use a constant from `KEYS` for shared endpoints, or a synthetic stable key for dynamic-URL resources.
- **`fetcher`** — optional; defaults to `GET key → JSON`. Pass a custom function when the URL is dynamic but the key must stay stable (e.g. calendar home events).
- **`config`** — any SWR config; merged on top of defaults.

### Behaviour

| Feature | How |
|---|---|
| Instant paint on revisit | `localStorage` snapshot seeds SWR **after mount** (`useEffect`) to avoid SSR hydration mismatches; SWR always revalidates in background |
| Request dedup | SWR dedupes concurrent mounts with the same key within `dedupingInterval` (4 s) |
| Revalidate on focus / reconnect | SWR defaults (`revalidateOnFocus`, `revalidateOnReconnect`) |
| Optimistic update | `mutate(KEYS.x, optimisticData)` or `mutate(KEYS.x)` to revalidate |
| Snapshot schema drift | `lsRead` is try/catch; stale entries expire after 1 hour |

### Snapshot limits

- Max entry size: 50 KB. Larger payloads are never written; any existing snapshot for that key is cleared so stale undersized data is not reused.
- Expiry: 1 hour. Expired entries are dropped on read.
- Namespace: `aos.cache.<key>` — never stores auth tokens or vault file bodies.

## Key constants (`src/lib/data/keys.ts`)

| Constant | Endpoint | Cache policy |
|---|---|---|
| `KEYS.home` | `GET /api/home` | `private, max-age=20, stale-while-revalidate=60` |
| `KEYS.health` | `GET /api/health` | browser default |
| `KEYS.tasksDueAll` | `GET /api/clickup/tasks?due=all` | `private, max-age=15, stale-while-revalidate=60` |
| `KEYS.sprintLatest` | `GET /api/clickup/sprint/latest` | `private, max-age=15, stale-while-revalidate=60` |
| `KEYS.calendarStatus` | `GET /api/integrations/google-calendar/status` | browser default |
| `KEYS.calendarHomeEvents` | synthetic key → `GET /api/calendar/events?...` | `private, max-age=15, stale-while-revalidate=60` |
| `KEYS.todosDue` | `GET /api/todos?due=true` | browser default |
| `KEYS.todosActive` | `GET /api/todos?status=active` | browser default |
| `KEYS.clickupTime` | `GET /api/clickup/time` | browser default |

Routes with user-mutated data (`/api/inbox`, `/api/todos` PATCH/DELETE, all POSTs) carry no cache headers — `no-store` by default.

## Adding a new cached endpoint

1. Add a constant to `KEYS` in `src/lib/data/keys.ts`.
2. Call `useResource<YourType>(KEYS.myKey)` in your component.
3. After mutations, call `mutate(KEYS.myKey)` to revalidate.
4. If the API route is read-only and safe to cache, add a `Cache-Control: private, max-age=N, stale-while-revalidate=60` header to the route handler.
