# Ticket 5 Test Checklist — Checkout Atomicity (Receipt Confirm & Shopping Purchase)

## What this verifies

Ticket 5 wrapped two "checkout-like" flows in a single `db.transaction()` each, so that a failure partway through rolls back **everything** in that action — not just the item that failed.

- **`POST /api/receipts/:id/confirm`** (`artifacts/api-server/src/routes/receipts.ts`): every receipt item's pantry insert + Acquire event + `addedToPantry` flag, plus the receipt's own `status: 'confirmed'` update, now all commit or roll back together.
- **`POST /api/shopping/purchase`** (`artifacts/api-server/src/routes/shopping.ts`): the receipt creation + every item's pantry insert + Acquire event + removing it from the shopping list, all commit or roll back together.

**Important nuance:** happy-path testing alone can't distinguish "this is atomic" from "this was never atomic and just happened to work" — both old and new code succeed when nothing fails. The tests below include a deliberate failure-injection step, because that's the only way to actually prove the rollback behavior.

---

## Prerequisites

Same as previous checklists: dev servers running, real `DATABASE_URL`, logged in, Network tab open.

---

## Test 1 — Happy path: shopping purchase

**Steps:**
1. Add 2-3 items to your Shopping List.
2. Go through the "mark as purchased" flow that calls `POST /api/shopping/purchase` with all of them, a store name, and a purchase date.

**Check:**
- Response `200`, `{ ok: true, receiptId: "<uuid>" }`.
- All purchased items now appear in the Pantry tab.
- All purchased items are gone from the Shopping List.
- A new receipt appears in the Receipts tab with `status: confirmed` and the right item count/total.

**PASS:** all three (pantry items added, shopping items removed, receipt created+confirmed) happened together.
**FAIL:** any partial result — e.g. items added to pantry but still on the shopping list, or vice versa.

---

## Test 2 — Failure injection: shopping purchase (proves atomicity, not just happy path)

This is the test that actually proves the rollback works.

**Steps:**
1. Add 2-3 items to your Shopping List (note their names/ids).
2. Go through the purchase flow once normally to see the request shape, but **don't let it complete yet** — or just do it once first as a dry run, then repeat for the actual test.
3. In the Network tab, find the `/api/shopping/purchase` request. Right-click → **Copy as fetch**.
4. Paste into the Console, and **edit the JSON body**: set one item's `"name"` to `null` (this violates `pantry_items.name NOT NULL`, which should throw partway through the loop). Leave the other items valid.
5. Run the edited fetch call.

**Check:**
- The request should **fail** (non-`200` status, or a thrown error in the console — check exactly what comes back; a `500` here is acceptable since this is an intentionally malformed request, unlike ticket 4's clean `409`s).
- **None** of the items from this batch — including the *valid* ones that would have succeeded on their own — should appear in the Pantry tab.
- **No** new receipt should have been created for this attempt.
- The shopping list items should be untouched (still present, not deleted).

**PASS:** the whole batch rolled back — valid items included. This is the actual proof of atomicity.
**FAIL:** the valid items got added to pantry / removed from the shopping list even though one item in the batch failed. That means the transaction isn't actually wrapping everything (a regression from what ticket 5 intended).

---

## Test 3 — Happy path: receipt confirm

**Steps:**
1. Create or upload a receipt with 2+ line items (via whatever the receipt-scan/upload flow is).
2. Confirm it with "add to pantry" enabled — calls `POST /api/receipts/:id/confirm` with `{ addToPantry: true }`.

**Check:**
- Response `200`, `{ ok: true }`.
- All receipt items appear in the Pantry tab.
- The receipt's status shows as confirmed.
- Each receipt item shows `addedToPantry: yes` (check via the receipt detail view or, if accessible, the API response for `GET /api/receipts/:id`).

**PASS:** all of the above happened together.
**FAIL:** partial state (some items added, receipt still pending, etc).

---

## Test 4 — Failure injection: receipt confirm (requires direct DB access)

Unlike the shopping-purchase endpoint, `confirm`'s request body doesn't carry the item data directly (items come from the already-stored `receipt_items` table) — so there's no JSON payload to tamper with via DevTools. To actually inject a failure here, you need to corrupt a row in the database directly before confirming:

```sql
-- Pick one receipt_item belonging to a receipt with 2+ items, and null its name
update receipt_items set name = null where id = '<one receipt item id>';
```

**Steps:**
1. With that row corrupted, confirm the receipt (`addToPantry: true`) as in Test 3.

**Check:**
- The confirm request should fail (non-200).
- **None** of the receipt's items — including the ones you didn't corrupt — should appear in the Pantry tab.
- The receipt's status should remain **unconfirmed** (not flipped to `confirmed`).
- None of the receipt items should show `addedToPantry: yes`.

**PASS:** everything rolled back together, including the valid items and the status flag.
**FAIL:** valid items got added to pantry, or the receipt status flipped to confirmed, despite the corrupted item causing a failure.

**Cleanup:** don't forget to fix the row back afterward if you want to reuse that receipt: `update receipt_items set name = '<original name>' where id = '<id>';`

---

## Overall pass/fail

**Ticket 5 passes** if Tests 1 and 3 (happy path, both endpoints) pass, **and** at least one of Test 2 or Test 4 (failure injection) confirms the rollback actually happens. Happy-path-only testing is not sufficient evidence for this ticket specifically — the whole point is behavior that only shows up when something fails.

**Known, deliberate scope note from ticket 5:** these transactions do *not* separate "Inventory Truth" from "Financial Truth" the way canon's Dual Truth Model literally describes (receipt status flags are treated as part of the same synchronous action, not async financial processing). If that's wrong, it's a design conversation to have with Mike, not a bug these tests would catch.
