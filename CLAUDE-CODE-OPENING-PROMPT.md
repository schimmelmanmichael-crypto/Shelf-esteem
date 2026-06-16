# CLAUDE CODE — SHELF ESTEEM BUILD PROMPT
# Paste this entire prompt to start the build session

---

You are about to autonomously build Shelf Esteem — a complete full-stack household kitchen management SaaS application. You have two specification documents in this project folder:

1. `shelf-esteem-lovable-frontend.md` — Complete frontend specification
2. `shelf-esteem-backend-deploy.md` — Complete backend specification  
3. `CLAUDE.md` — Your project instructions (you've already read this)

## YOUR MISSION

Build the complete Shelf Esteem application from scratch based on the two specification documents. This is a full autonomous build — you write every file, install every dependency, set up the database schema, and get the app running locally.

## CRITICAL RULES — READ BEFORE TOUCHING ANY CODE

1. **Read both spec files completely before writing a single line of code**
2. **Mascot is SHELFY** — never "Selfie," never "Shelfie"
3. **No Chef Agent system** — do not build anything chef-related, it was cut from scope
4. **Plan first, build second** — output your full architecture plan before writing any files
5. **All new DB columns must be nullable** — no migration files, uses drizzle-kit push
6. **Express 5 async handlers** must use `Promise<void>` return type + `res.json(); return;` pattern
7. **TEST_MODE ON client-side** — all plan limits are Infinity, GatedFeature never blocks
8. **Community routes open** — no auth required for community posting, intentional
9. **Dark mode must be fully wired** — ThemeProvider + CSS variables + toggle in Layout

## BUILD ORDER

Follow this exact sequence:

### Phase 1 — Project Structure
1. Create pnpm workspace structure
2. Set up `pnpm-workspace.yaml`
3. Create root `package.json`
4. Create `tsconfig.base.json` and `tsconfig.json`

### Phase 2 — Database Layer
1. Create `lib/db/` package
2. Write ALL Drizzle schema files (one per domain — 25+ tables)
3. Set up `drizzle.config.ts`
4. Create `lib/db/package.json`

### Phase 3 — Backend
1. Create `artifacts/api-server/` structure
2. Write `app.ts` — Express app with all middleware
3. Write `index.ts` — server entry point with Stripe init, seeds, crons
4. Write ALL middleware: `requireAuth.ts`, `clerkProxyMiddleware.ts`
5. Write ALL lib files: `logger.ts`, `planLimits.ts`, `pantry-deduction.ts` (with unit conversion), `barcodeService.ts`, `demo.ts`, `serialize.ts`
6. Write ALL email files: `emailCron.ts`, `leftoverCron.ts` (NEW), `emailTemplates.ts`, `resendClient.ts`
7. Write ALL routes (20+ route files)
8. Write `build.mjs` — esbuild bundle script

### Phase 4 — Frontend
1. Create `artifacts/pantry-app/` structure  
2. Set up `vite.config.ts`
3. Write `src/index.css` with Tailwind v4 @theme config + dark mode CSS variables
4. Write `src/App.tsx` — ThemeProvider + ClerkProvider + QueryClientProvider + router
5. Write ALL pages (20+ pages)
6. Write ALL components including ThemeToggle (NEW)
7. Write Layout with dark mode toggle wired in

### Phase 5 — PWA
1. Create `public/manifest.json`
2. Create `public/sw.js` — service worker

### Phase 6 — Verify
1. Run `pnpm install`
2. Run `pnpm run typecheck`
3. Fix any TypeScript errors
4. Run `pnpm --filter @workspace/db run push` (requires DATABASE_URL)
5. Run `pnpm --filter @workspace/api-server run dev`
6. Run `pnpm --filter @workspace/pantry-app run dev`
7. Confirm both servers start without errors

## NEW FEATURES TO BUILD (not in original Replit code)

These four features were decided and must be built from scratch:

### 1. Unit Conversion in Cooking Deduction
In `lib/pantry-deduction.ts`, add conversion table and `convertUnits()` function.
Converts between: tsp/tbsp/cup/ml/fl_oz (volume) and oz/lb/g/kg (weight) before deduction runs.
Spec is in `shelf-esteem-backend-deploy.md` Section 5.1.

### 2. Missed Opportunity Auto-Detection Cron
Create `artifacts/api-server/src/lib/leftoverCron.ts`
Runs daily at 06:00, finds active leftovers where expiration_date < today AND servings_available > 0.
Auto-logs them as missed_opportunities with reason: 'expired'.
Spec is in `shelf-esteem-backend-deploy.md` Section 5.2.

### 3. Complete AI Coupon Finder
Fix `POST /shopping/coupons` route — complete response parsing + graceful JSON fallback.
Returns structured `{ coupons, generalTips, estimatedTotalSavings }`.
Spec is in `shelf-esteem-backend-deploy.md` Section 5.3.

### 4. Dark Mode — Fully Wired
ThemeProvider in App.tsx, CSS variables in index.css, ThemeToggle component.
Toggle in desktop sidebar + mobile nav + Account page.
Clerk SignIn/SignUp dark theme integration.
Spec is in `shelf-esteem-lovable-frontend.md` Section 6.

## ENVIRONMENT VARIABLES NEEDED

Create a `.env.example` file with these keys (no values):
```
DATABASE_URL=
PORT=8080
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
RESEND_API_KEY=
ADMIN_USER_ID=
OPENAI_API_KEY=
RECIPE_SEED_KEY=shelf-esteem-seed-2026
TESTER_CODES=SHIMMYPLAN,SHELFTESTER
DEMO_SEED_CODE=PANTRYDEMO
LOG_LEVEL=info
NODE_ENV=development
VITE_CLERK_PUBLISHABLE_KEY=
VITE_CLERK_PROXY_URL=/api/__clerk
```

## AFTER THE BUILD

When the build is complete and both servers start without errors:

1. Tell me exactly what environment variables I need to fill in
2. Tell me what the next steps are to connect to Railway PostgreSQL
3. Tell me how to run the database schema push
4. Confirm the app is ready for production deployment

## START NOW

Read `shelf-esteem-lovable-frontend.md` and `shelf-esteem-backend-deploy.md` completely, then output your architecture plan, then begin building.
