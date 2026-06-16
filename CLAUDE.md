# CLAUDE.md — Shelf Esteem Project Instructions
# Claude Code reads this file automatically at the start of every session

## PROJECT OVERVIEW

**App:** Shelf Esteem — household kitchen management SaaS  
**Tagline:** "Stop Buying What You Already Own"  
**Mascot:** Shelfy (NEVER "Selfie" — this is a critical brand rule)  
**Owner:** Mike Schimmelman (Shimmy) — Third Act Studios / Cocopop Productions  
**Domain:** shelfesteem.app

## TECH STACK

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24 |
| Package Manager | pnpm (workspaces) | — |
| Language | TypeScript | ~5.9.3 |
| Frontend | React | 19.1.0 |
| Build Tool | Vite | ^7.3.2 |
| Backend | Express | ^5.2.1 |
| CSS | Tailwind CSS v4 (Vite plugin) | ^4.1.14 |
| Components | shadcn/ui (Radix UI) | various |
| State — Server | TanStack Query v5 | ^5.90.21 |
| State — Client | React local state only (NO Zustand) | — |
| Routing | Wouter | ^3.3.5 |
| ORM | Drizzle ORM | 0.45.2 |
| Database | PostgreSQL | 16 |
| Auth | Clerk | @clerk/express ^2.1.22 |
| Payments | Stripe | ^22.2.0 |
| Email | Resend | ^6.12.4 |
| AI | OpenAI GPT-4o | — |
| Barcode | @zxing/library + html5-qrcode | — |
| Charts | Recharts | ^2.15.2 |
| Animation | Framer Motion | ^12.23.24 |
| Theme | next-themes | ^0.4.6 |
| Background Jobs | node-cron | ^4.2.1 |
| Logging | Pino + pino-http | — |
| Validation | Zod v4 + drizzle-zod | 3.25.76 |

## WORKSPACE STRUCTURE

```
/
├── CLAUDE.md                        ← You are here
├── package.json                     # Root workspace
├── pnpm-workspace.yaml
├── tsconfig.json                    # Solution file
├── tsconfig.base.json               # Shared strict TS defaults
├── .env                             # Environment variables (never commit)
├── .env.example                     # Template (commit this)
├── artifacts/
│   ├── api-server/                  # Express 5 backend (port 8080)
│   │   ├── src/
│   │   │   ├── index.ts             # Entry point
│   │   │   ├── app.ts               # Express app
│   │   │   ├── webhookHandlers.ts   # Stripe webhooks
│   │   │   ├── stripeClient.ts      # Stripe credentials
│   │   │   ├── seedGlobalRecipes.ts # Recipe seeding
│   │   │   ├── middlewares/
│   │   │   │   ├── requireAuth.ts
│   │   │   │   └── clerkProxyMiddleware.ts
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── planLimits.ts
│   │   │   │   ├── pantry-deduction.ts  ← UNIT CONVERSION ADDED
│   │   │   │   ├── serialize.ts
│   │   │   │   ├── barcodeService.ts
│   │   │   │   ├── demo.ts
│   │   │   │   └── email/
│   │   │   │       ├── emailCron.ts
│   │   │   │       ├── leftoverCron.ts  ← NEW
│   │   │   │       ├── emailTemplates.ts
│   │   │   │       └── resendClient.ts
│   │   │   └── routes/
│   │   │       ├── index.ts
│   │   │       ├── health.ts
│   │   │       ├── pantry.ts
│   │   │       ├── recipes.ts
│   │   │       ├── shopping.ts      ← COUPON ROUTE FIXED
│   │   │       ├── mealPlan.ts
│   │   │       ├── receipts.ts
│   │   │       ├── receiptParse.ts
│   │   │       ├── weeklyAds.ts
│   │   │       ├── weeklyAdParse.ts
│   │   │       ├── deals.ts
│   │   │       ├── priceAlerts.ts
│   │   │       ├── spending.ts
│   │   │       ├── community.ts
│   │   │       ├── billing.ts
│   │   │       ├── referral.ts
│   │   │       ├── admin.ts
│   │   │       ├── household.ts
│   │   │       ├── leftovers.ts
│   │   │       ├── receiptCodeMap.ts
│   │   │       ├── dataReset.ts
│   │   │       └── demo.ts
│   │   ├── build.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── pantry-app/                  # React + Vite frontend (port 8082)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx              ← ThemeProvider wired here
│       │   ├── index.css            ← Tailwind v4 @theme + dark mode vars
│       │   ├── pages/               ← 20+ pages
│       │   ├── components/
│       │   │   ├── layout.tsx       ← Dark mode toggle in sidebar + mobile nav
│       │   │   ├── theme-toggle.tsx ← NEW
│       │   │   └── ui/              ← shadcn/ui ~45 components
│       │   ├── context/
│       │   │   └── help-context.tsx
│       │   ├── hooks/
│       │   │   ├── usePlanLimits.ts
│       │   │   └── use-mobile.tsx
│       │   └── data/
│       │       └── help-content.ts
│       ├── public/
│       │   ├── manifest.json        ← PWA manifest
│       │   ├── sw.js                ← Service worker
│       │   └── favicon.svg
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
└── lib/
    └── db/                          # @workspace/db
        ├── src/
        │   ├── index.ts
        │   └── schema/              ← 25+ table files
        ├── drizzle.config.ts
        └── package.json
```

## CRITICAL CODING RULES

### Express 5 Async Pattern
```typescript
// CORRECT — always use this pattern
router.get('/route', requireAuth, async (req, res): Promise<void> => {
  const data = await someQuery();
  res.json(data);
  return;
});

// WRONG — don't use return res.json()
router.get('/route', async (req, res) => {
  return res.json(data); // ❌ This causes TypeScript errors in Express 5
});
```

### Database — All New Columns Must Be Nullable
```typescript
// CORRECT
newColumn: text('new_column'), // nullable by default in Drizzle

// WRONG  
newColumn: text('new_column').notNull(), // ❌ Will break existing rows
```

### No Drizzle Migration Files — Push Only
```bash
pnpm --filter @workspace/db run push
# NOT: drizzle-kit generate + migrate
```

### Tailwind v4 — No Config File
```css
/* CORRECT — config lives in src/index.css */
@import "tailwindcss";
@theme {
  --color-primary: #16a34a;
  /* etc */
}

/* WRONG — tailwind.config.js does not exist in this project */
```

### Clerk Proxy — Same Origin
All Clerk JS SDK calls must route through `/api/__clerk`:
```typescript
// In App.tsx
<ClerkProvider clerkJSUrl="/api/__clerk" publishableKey={...}>
```

### No Zustand
State management is TanStack Query v5 for server state + React local state only.
Do not install or use Zustand.

## LOCKED DECISIONS — DO NOT CHANGE

| Decision | Rule |
|---|---|
| Community auth | Open — no requireAuth on community routes. Intentional. |
| Client plan limits | TEST_MODE = ON. All limits Infinity client-side. Do not gate anything. |
| Dark mode | Must be fully wired — ThemeProvider + CSS vars + toggle in Layout |
| AI Coupon Finder | Must be complete — full response parsing + UI |
| Missed opportunity cron | Must exist — daily 06:00, auto-detects expired leftovers |
| Unit conversion | Must be in pantry-deduction.ts — tsp/tbsp/cup/ml/oz/lb/g/kg |
| Chef Agent system | CUT — do not build anything chef-related |
| Recipe Photo Scan | CUT — do not build |
| AI Chat UI | CUT — conversations/messages tables exist in DB, no routes or UI |

## BRAND RULES

- **Mascot:** Shelfy (NEVER Selfie, NEVER Shelfie)
- **Primary color:** #16a34a (green-600)
- **Dark mode primary:** #22c55e (green-500, slightly lighter for dark bg)
- **Font:** DM Sans, fallback Inter, fallback sans-serif
- **Tone:** Practical, encouraging, lightly humorous

## TESTER CODES

```
SHIMMYPLAN    → unlocks all plan features
SHELFTESTER   → unlocks all plan features  
PANTRYDEMO    → activates demo mode
```

## BACKGROUND JOBS (node-cron)

| Job | Schedule | File |
|---|---|---|
| Email sequence | Daily 09:00 | `emailCron.ts` |
| Leftover expiry | Daily 06:00 | `leftoverCron.ts` ← NEW |
| Stripe backfill | On startup | `index.ts` |
| Global recipe seed | On startup | `seedGlobalRecipes.ts` |

## DEVELOPMENT COMMANDS

```bash
# Install all dependencies
pnpm install

# Type check everything
pnpm run typecheck

# Start API server (dev)
pnpm --filter @workspace/api-server run dev

# Start frontend (dev)  
pnpm --filter @workspace/pantry-app run dev

# Push database schema
pnpm --filter @workspace/db run push

# Build all
pnpm run build

# Build API server only
pnpm --filter @workspace/api-server run build

# Build frontend only
pnpm --filter @workspace/pantry-app run build
```

## PORTS

| Service | Port |
|---|---|
| API Server | 8080 |
| Frontend Dev | 8082 |

## RESEND SENDER — PENDING ACTION

The Resend sender email in `resendClient.ts` must be:
```
shelfy@shelfesteem.app
```
This is pending domain verification in Resend dashboard.
Do NOT use `onboarding@resend.dev` in production.

## FULL SPEC FILES

Read these for complete implementation details:
- `shelf-esteem-lovable-frontend.md` — All pages, components, routing, dark mode
- `shelf-esteem-backend-deploy.md` — All routes, DB schema, auth, new features

## SESSION BEHAVIOR

At the start of every Claude Code session:
1. Read this CLAUDE.md file (automatic)
2. Check what files already exist before writing new ones
3. Never overwrite working code without reading it first
4. Run typecheck after major changes
5. Always use Plan mode before implementing — diagnose before touching code
