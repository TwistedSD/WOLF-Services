# Killmail Cache Server (JSON on disk)

A tiny Express server that periodically fetches killmails from the World API, stores them as JSON on disk, and serves a simple paginated API for the client.

- Default port: `8787`
- Data directory: `packages/server/data`
  - `killmails.json`: full list (newest first)
  - `killmails.meta.json`: `{ ts, total }`
- Refresh interval: 5 minutes

## Env vars

- `PORT` (default `8787`)
- `REFRESH_MS` (default `300000`)
- `WORLD_API_HTTP` (defaults to `https://world-api-stillness.live.tech.evefrontier.com`)

## Endpoints

- `GET /api/health` → `{ ok, lastUpdated, total }`
- `GET /api/killmails?limit&offset` → `{ data, metadata: { total, limit, offset } }`

## Run locally

```powershell
# from repo root (Windows PowerShell)
pnpm -C packages/server install
pnpm -C packages/server run dev
```

Then point the client to it:

Create `packages/client/.env` (if you haven't already) and add:

```
VITE_KILLMAILS_BASE=http://localhost:8787
```

Start the client:

```powershell
pnpm -C packages/client install
pnpm -C packages/client run dev
```

Visit `/killboard` and you should see `Cache: <timestamp>` once the server finishes the initial refresh.
