---
name: Saga Inventory stack decisions
description: Key conventions and non-obvious decisions for the Saga Inventory project.
---

## Settings persistence
Settings are stored in the `settings` PostgreSQL table as key-value pairs (key varchar PK, value text). API: GET/POST `/api/settings` (POST accepts `Record<string, string>`). Keys used: `businessName`, `businessEmail`, `businessPhone`, `lowStockThreshold`, `receiptFooter`.

**Why:** Simple key-value allows adding new settings without schema migrations.

## Profit calculation
Profit is computed from `sale_items.unit_price - sale_items.buying_price × quantity`, NOT from any estimate on the `sales` table. The `buying_price` is snapshotted at time of sale into `sale_items`.

**Why:** Product buying prices can change; the snapshot preserves historical accuracy.

## Receipt number generation
Format: `RCP-{year}-{6-digit-timestamp-suffix}{3-digit-random}`. Avoids race conditions from COUNT(*)-based numbering.

**Why:** Two concurrent sales would get the same receipt number if using COUNT.

## Stock validation
Server-side: before inserting a sale, storage checks each item's available quantity and throws an error if insufficient. The client also enforces this via availableStock on CartItem.

## Settings in sidebar
Use the `NavGroup` component for all sidebar sections including settings — do NOT call `useLocation()` inside `.map()` callbacks (React hooks violation).

## Backend restart required
Backend (Express/tsx) does NOT hot-reload. Any change to `server/` or `shared/` files requires restarting the "Start application" workflow before taking effect.

## Docker setup
`Dockerfile` + `docker-compose.yml` at project root. Compose spins up postgres:16-alpine + app. POSTGRES_PASSWORD via env var (default "changeme"). App exposes port 5000 with health check on `/api/health`.
