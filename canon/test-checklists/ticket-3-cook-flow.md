# Ticket 3 Test Checklist — Cook This Flow (pantry_items → event-sourced Consume)

## What this verifies

Ticket 3 converted the recipe-cook pantry deduction from a direct `pantry_items.quantity` update into an event-sourced write: every ingredient consumed now also inserts a `pantry_events` row (`event_type = 'consume'`) in the same database transaction. This checklist verifies that conversion didn't break the existing user-visible behavior, and (optionally, if you have DB access) that the event log is actually being written correctly underneath.

Also exercises the frontend wiring from commit `60d17f2` (`cookSessionId` / `leftoverServings` now sent in the request).

**Endpoint under test:** `POST /api/recipes/:id/cook`
**Frontend file:** `artifacts/pantry-app/src/pages/recipes/detail.tsx`
**Backend files:** `artifacts/api-server/src/routes/recipes.ts`, `artifacts/api-server/src/lib/pantry-deduction.ts`

---

## Prerequisites

1. Both dev servers running: `pnpm --filter @workspace/api-server run dev` and `pnpm --filter @workspace/pantry-app run dev`, with a real `DATABASE_URL` set.
2. Logged in via Clerk.
3. Browser DevTools open — **Network tab** (filter by `cook` or `Fetch/XHR`) and **Console tab** (watch for red errors), before you start clicking.
4. Set up pantry + recipe state for three scenarios (use the Pantry tab to add/edit items, and pick or create a recipe with at least 2-3 ingredients):
   - **Ingredient A** — plenty of stock in pantry (e.g. quantity `10`, unit matches the recipe's ingredient unit).
   - **Ingredient B** — low stock, *less* than what the recipe needs at 1 serving (e.g. recipe needs `2 cups`, pantry has `0.5 cups`). This exercises the zero-floor clamp.
   - **Ingredient C** — not in the pantry at all (delete it if it exists, or pick a recipe ingredient you know isn't stocked).

Note the recipe's `id` from the URL (`/recipes/<id>`) — you'll want it if you check the database directly.

---

## Test 1 — Happy path (sufficient stock)

**Steps:**
1. Navigate to the recipe detail page for your test recipe (`/recipes/<id>`).
2. Confirm the "Cook This Recipe" section shows **two** number inputs: `Servings:` and `Save as leftovers:` (this second one is new from commit `60d17f2` — if it's missing, the frontend change didn't deploy).
3. Leave Servings at `1`, leave "Save as leftovers" at `0`.
4. Click **🍳 Cook This**.

**Check the Network tab request:**
- Method: `POST`, URL ends in `/api/recipes/<id>/cook`
- Request payload (Payload/Request tab) should be JSON containing:
  ```json
  { "servings": 1, "cookSessionId": "<a UUID>", "leftoverServings": 0 }
  ```
  — `cookSessionId` must look like a real UUID (`xxxxxxxx-xxxx-...`), not empty/undefined.

**Check the response:**
- Status: `200`
- Body: `{ "ok": true, "deducted": [...], "addedToShopping": [...], "leftoverId": null }`
- `deducted` should include Ingredient A's name (and B's, if using default sufficient stock for this test). `leftoverId` should be `null` since `leftoverServings` was `0`.

**Check the UI:**
- Button shows "Cooking..." briefly, then a success toast: **"Pantry updated! Missing items added to shopping list."**
- Go to the Pantry tab — Ingredient A's quantity should be reduced by exactly the recipe's required amount.

**PASS:** all of the above match.
**FAIL / red flags:** `cookSessionId` missing or `undefined` in the payload; response status isn't `200`; pantry quantity didn't change at all; console shows a red error; toast says "Cook failed" when it shouldn't.

---

## Test 2 — Insufficient stock (zero-floor clamp)

**Steps:**
1. Same recipe, but make sure Ingredient B (low stock) is one of the ingredients being deducted.
2. Click **🍳 Cook This** again (this generates a fresh `cookSessionId` automatically since Test 1 succeeded — confirm in the Network tab that this request's `cookSessionId` is a **different** UUID than Test 1's).

**Check:**
- Response still `200`, `ok: true`.
- Ingredient B's pantry quantity is now `0` (not negative) — the deduction clamps at zero rather than going negative.
- `addedToShopping` in the response includes Ingredient B's name.
- Check the Shopping List tab — Ingredient B should now appear there.

**PASS:** quantity is exactly `0`, item appears on shopping list, no error.
**FAIL:** quantity is negative or unchanged; item missing from shopping list.

---

## Test 3 — Ingredient not in pantry at all

**Steps:**
1. Use a recipe (or ingredient) where one ingredient (Ingredient C) has no matching pantry item.
2. Click **🍳 Cook This**.

**Check:**
- Response still `200`, `ok: true`.
- `addedToShopping` includes Ingredient C.
- `deducted` does **not** include Ingredient C (nothing to deduct — it was never in the pantry).
- Shopping List tab shows Ingredient C added.

**PASS:** as above, no error, no phantom pantry row created for C.
**FAIL:** an error is thrown, or C incorrectly appears in `deducted`.

---

## Test 4 — Servings scaling

**Steps:**
1. Reset Ingredient A's pantry quantity to a known value (e.g. `10`).
2. Set Servings to `3` before clicking Cook This.
3. Click **🍳 Cook This**.

**Check:**
- Request payload shows `"servings": 3`.
- Ingredient A's pantry quantity dropped by **3×** the recipe's per-serving amount, not 1×.

**PASS:** quantity reduced by the scaled amount.
**FAIL:** quantity only reduced by the 1-serving amount (scaling not applied).

---

## Database verification (optional, but the most direct proof ticket 3 actually works)

The Network tab only shows you the HTTP response — it can't show you whether a `pantry_events` row was actually written. If you have a way to run SQL against the dev database (`psql $DATABASE_URL`, a GUI client, or Railway's query console), run this after Test 1:

```sql
select event_type, quantity_delta, unit, source, idempotency_key, reason_code, metadata, created_at
from pantry_events
order by created_at desc
limit 5;
```

**Expected:** one row per ingredient deducted in Test 1, with:
- `event_type = 'consume'`
- `quantity_delta` — a **negative** number matching what came out of the pantry
- `source = 'recipe_cook'`
- `idempotency_key` — formatted like `<cookSessionId>:<pantryItemId>`
- `metadata` — JSON containing `recipe_id`, `cook_session_id`, and `idempotency_payload`

**PASS:** rows exist, `quantity_delta` is negative and matches the deducted amount, `metadata.cook_session_id` matches the `cookSessionId` you saw in the Network tab request.
**FAIL:** no rows at all (events aren't being written), or `quantity_delta` is positive/wrong, or metadata is missing fields.

---

## Overall pass/fail

**Ticket 3 passes** if Tests 1-4 all pass on the frontend/network level. The database check is optional confirmation but strongly recommended at least once, since it's the only way to directly confirm the event-sourcing itself (as opposed to just "the pantry quantity changed," which could theoretically still be happening via the old direct-mutation path if something regressed).

If anything fails, note which test number, what you expected vs. what you saw (exact response body / DB row if possible), and bring that back for a fix — don't just say "cooking doesn't work."
