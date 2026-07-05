# Operational Notes — Preserved from Pre-RC2 CLAUDE.md

Carried over from the old root CLAUDE.md (uncommitted at the time of the RC2 canon
adoption) because this content doesn't exist in the RC2 canon docs or in git history.

## RAILWAY DEPLOYMENT — KNOWN GOTCHAS

### Per-service `railway.json` files override everything
There are FOUR `railway.json` files in this repo: the repo root, and one each in `artifacts/api-server/`, `artifacts/pantry-app/`, `lib/db/`. Each Railway service is wired to read its own nested file regardless of the dashboard's "Root Directory" setting, and that file's `build.builder`/`build.buildCommand` fully controls the build — it does NOT fall back to the root `nixpacks.toml`.

- `artifacts/api-server/railway.json`'s `buildCommand` must build all three workspaces in order, because api-server now serves the built pantry-app frontend as static files (single-origin deploy):
  ```json
  "buildCommand": "pnpm --filter @workspace/db run build && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/pantry-app run build"
  ```
  If this ever gets trimmed back to just `db` + `api-server`, the frontend silently stops being built and `GET /` / any SPA route 500s (`sendFile` on a missing `artifacts/api-server/public/index.html`).
- Builder must stay `RAILPACK` for the api-server service. `NIXPACKS` doesn't have pnpm preinstalled — switching to it breaks the build with `pnpm: command not found` unless a `nixpacks.toml` install phase is hand-rolled too.

### Watch Paths must cover the whole repo for the api-server service
Since this one service now builds three workspace packages, its Watch Paths setting must NOT be scoped to just `/artifacts/api-server/**` — a push that only touches `artifacts/pantry-app/src/**` would otherwise be silently skipped ("No changes to watched files") even though the deployed build depends on that code. Leave Watch Paths empty (watch everything) rather than enumerating all three package paths.

### `VITE_`-prefixed env vars are build-time only
Vite inlines `VITE_*` vars into the JS bundle at build time — adding one to Railway Variables does nothing until there's an actual fresh build, not just a redeploy/restart of the existing image. To verify a var actually landed in a deployed bundle, fetch the deployed JS asset and grep for an expected fragment of its value; if the var resolved to `undefined` at build time, that literal won't appear anywhere in the bundle.

## RESEND SENDER — PENDING ACTION

The Resend sender email in `resendClient.ts` must be:
```
shelfy@shelfesteem.app
```
This is pending domain verification in Resend dashboard.
Do NOT use `onboarding@resend.dev` in production.
