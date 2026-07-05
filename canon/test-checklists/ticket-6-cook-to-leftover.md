# Ticket 6 Test Checklist — Cook-to-Leftover Atomicity

## What this verifies

Ticket 6 made two related changes to `applyPantryDeduction` (`artifacts/api-server/src/lib/pantry-deduction.ts`):

1. **Whole-recipe atomicity:** every ingredient's Consume event now shares **one** transaction for the entire cook, not one transaction per ingredient (that was the ticket 3/4 behavior, which didn't actually satisfy canon's "all Consume events commit or none" for a whole recipe).
2. **Leftover creation wired in:** `POST /api/recipes/:id/cook` now accepts an optional `leftoverServings` field (surfaced in the UI as the "Save as leftovers" input added in commit `60d17f2`). When set > 0, it atomically creates a `leftovers` row **and** a `transform` event, in the *same* transaction as the ingredient deductions.

This checklist assumes you've already run `ticket-3-cook-flow.md` and `ticket-4-idempotency.md` — it focuses specifically on the leftover-creation part and the whole-recipe atomicity, not re-testing basic deduction.

**Endpoint under test:** `POST /api/recipes/:id/cook`

---

## Prerequisites

Same as previous checklists. Also: know where the **Leftovers tab** is in the app, since that's where you'll check the created leftover.

---

## Test 1 — Happy path: cook with leftovers requested

**Steps:**
1. Go to a recipe detail page with ingredients in stock.
2. Set Servings to `2` (or whatever), and set **"Save as leftovers"** to `1` (or more).
3. Click **🍳 Cook This**.

**Check the request payload:**
- `{ "servings": 2, "cookSessionId": "<uuid>", "leftoverServings": 1 }`

**Check the response:**
- `200`, `{ "ok": true, "deducted": [...], "addedToShopping": [...], "leftoverId": "<a uuid, NOT null this time> }`
- This is the key difference from ticket 3/4's tests — `leftoverId` should be a real UUID now, not `null`, since `leftoverServings > 0`.

**Check the UI:**
- Ingredients deducted from pantry as expected (same as ticket 3 tests).
- Success toast should say **"Pantry updated! Leftovers saved. 🍱"** (not the plain "Missing items added to shopping list" version — the frontend switches the toast based on whether `leftoverId` came back).
- Go to the **Leftovers tab** — a new leftover should appear, with:
  - Meal name matching the recipe's name
  - Servings available = the `leftoverServings` you entered
  - Storage location defaulting to `fridge`

**PASS:** all of the above — deduction happened, leftover appeared with correct name/servings, correct toast shown.
**FAIL:** `leftoverId` is `null` despite requesting leftovers; no leftover appears in the Leftovers tab; wrong servings count on the leftover; wrong toast message.

---

## Test 2 — Regression check: cook WITHOUT leftovers still works

**Steps:**
1. Same recipe, set "Save as leftovers" back to `0`.
2. Click **🍳 Cook This**.

**Check:**
- `leftoverId` in the response is `null`.
- No new row appears in the Leftovers tab.
- Toast reverts to "Pantry updated! Missing items added to shopping list."

**PASS:** no leftover created, everything else unchanged from ticket 3's behavior.
**FAIL:** a leftover gets created even when `leftoverServings` was `0`.

---

## Test 3 — Idempotency for the leftover creation itself

The leftover's Transform event uses idempotency key `${cookSessionId}:leftover` — a duplicate request (same session) should create the leftover **once**, not twice.

**Steps:**
1. Cook with `leftoverServings > 0` as in Test 1, but before it completes, trigger a second identical request — either rapid double-click (see the timing note in `ticket-4-idempotency.md` Test 1), or copy the successful request as fetch and replay it in the console (Test 1b technique from that same file).

**Check:**
- Both responses come back `200 ok: true`, and both include the **same** `leftoverId` (not two different ones).
- Only **one** new row appears in the Leftovers tab, not two.
- (Optional, DB) `select count(*) from leftovers where recipe_id = '<recipe id>' and created_at > now() - interval '5 minutes';` should show exactly one new row from this test.

**PASS:** exactly one leftover created despite two requests; both responses reference the same `leftoverId`.
**FAIL:** two separate leftover rows created (duplicate-detection isn't working for the transform event specifically, even if it works for the consume events).

---

## Test 4 — Whole-recipe atomicity under failure (harder to test manually)

The strongest version of this test would be: make ONE ingredient's consume fail partway through a multi-ingredient recipe, and confirm that **no** ingredients were deducted at all (not even the ones before the failing one) — proving the whole recipe is one transaction, not per-ingredient like before ticket 6.

Unlike ticket 5's shopping-purchase test, there's no easy client-side payload to corrupt here (ingredients come from the recipe's own stored ingredient list server-side, not from the request body) — reliably forcing a mid-loop failure would need either a temporary code change or a script that races two conflicting requests. If you want this specifically verified, ask for a small test script rather than trying to trigger it by hand. Otherwise, treat this as covered by code review confidence (the diff wraps the entire ingredient loop + leftover creation in one `db.transaction()`) rather than manual proof.

---

## Optional DB verification

```sql
select event_type, leftover_id, quantity_delta, unit, metadata
from pantry_events
where event_type = 'transform'
order by created_at desc
limit 5;
```

**Expected:** one row per leftover created, with `leftover_id` matching the leftover's own `id`, `quantity_delta`/`unit` both `null` (per ticket 6's schema change — Transform events don't have a single-item quantity), and `metadata` containing `leftover_servings`, `recipe_id`, `cook_session_id`, `target_item_ids: ["<leftover id>"]`.

---

## Overall pass/fail

**Ticket 6 passes** if Tests 1-3 pass. Test 4 is optional/lower-priority for the same reason as ticket 4's race-condition test — genuinely hard to trigger by hand, reasonably covered by code review instead.
