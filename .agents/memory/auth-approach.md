---
name: Auth approach
description: How password-based session auth is implemented in Saga Inventory.
---

Single-password protection using express-session + memorystore (both already in package.json).

**How it works:**
- `server/auth.ts` — password constant (from `APP_PASSWORD` env or hardcoded default), rate limiter (10 attempts / 15 min per IP), `requireAuth` middleware.
- `server/index.ts` — session middleware added before routes; uses `MemoryStore` from `memorystore` package; 8-hour cookie; `HttpOnly`; `sameSite: "lax"`.
- `server/routes.ts` — `/api/auth/login`, `/api/auth/logout`, `/api/auth/status` registered BEFORE the `app.use("/api", requireAuth)` guard so they are public.
- `client/src/hooks/use-auth.ts` — `useQuery` for status with `on401: "returnNull"` so it never throws; mutations for login/logout; clears all cache on logout.
- `client/src/App.tsx` — `AppShell` checks `isAuthenticated`; shows spinner while loading, `LoginPage` if not authenticated, main layout if authenticated.
- `client/src/lib/queryClient.ts` — on 401 from any protected route, sets auth status cache to `{ authenticated: false }` so the login page reappears automatically.

**Why:**
- No username needed, single operator app.
- `memorystore` prevents memory leaks (auto-prunes expired sessions).
- Rate limiting prevents brute-force without needing Redis/DB.
- Session regeneration on login prevents session fixation attacks.

**Docker:**
- `APP_PASSWORD` and `SESSION_SECRET` are env vars in docker-compose.yml, both have safe defaults.
- `.env.example` documents all required vars.
