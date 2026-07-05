# Ticket 4 Test Checklist — Idempotency Validation (Cook Flow)

## What this verifies

Ticket 4 added `resolveIdempotency()` (`artifacts/api-server/src/lib/idempotency.ts`), wired into the cook-deduction flow only. Before writing a `consume` event, it checks whether an event with the same `(household_id, event_type, idempotency_key)` already exists:

- **Same key + same "requested inputs" payload** → treated as a duplicate: the pantry deduction is **skipped** (not re-applied), but the response still looks like a normal success.
- **Same key + different payload** → rejected as a genuine conflict: `409` response, nothing is mutated.

The "payload" being compared is `{ recipeId, ingredientName, requestedQuantity, requestedUnit, servings }` — the *requested* inputs, not the resulting `quantity_delta` (see the comment in `idempotency.ts` for why).

This is **only wired into cooking a recipe** — no other pantry-mutating endpoint validates idempotency yet, even though several of them generate keys.

**Endpoint under test:** `POST /api/recipes/:id/cook`

---

## Prerequisites

Same setup as `ticket-3-cook-flow.md`: dev servers running, real `DATABASE_URL`, logged in, DevTools Network tab open. Pick a recipe with an ingredient that has plenty of pantry stock (so repeated deductions don't hit the zero-floor clamp and confuse the results).

You'll need to actually reuse a `cookSessionId` across two requests to test this — the UI normally generates a fresh one after every successful cook, so you need one of the two techniques below.

---

## Test 1 — Duplicate detection (same key, same payload) via rapid double-click

**Steps:**
1. Go to the recipe detail page. Leave Servings at `1`, "Save as leftovers" at `0`.
2. Click **🍳 Cook This**, then **immediately click it again** before the button changes to "Cooking..." / before the first request finishes (you may need to click fast, or throttle the network in DevTools to "Slow 3G" to give yourself a bigger window).
3. In the Network tab, find both requests to `/cook`. Check the **Payload** of each — confirm both share the **exact same `cookSessionId`** (this only holds if you clicked before the first request's `onSuccess` fired and regenerated the id — if the two requests show *different* `cookSessionId` values, this test didn't actually exercise idempotency; slow the network down and try again).

**Check:**
- Both responses come back `200 ok: true` (the second one is **not** an error — canon says a duplicate is a no-op *success*, not a conflict).
- The pantry item's quantity dropped **once**, not twice. This is the entire point of the ticket — check the Pantry tab or the item's quantity directly.
- (Optional, DB) `select count(*) from pantry_events where idempotency_key = '<the shared cookSessionId>:<pantry_item_id>';` should return **1**, not 2.

**PASS:** quantity deducted exactly once; both requests returned success; only one `pantry_events` row exists for that key.
**FAIL:** quantity deducted twice (double-deduction — the exact bug idempotency exists to prevent); or the second request errored instead of no-op'ing; or two `pantry_events` rows exist with the same key (means the app-level check didn't catch it and something's wrong upstream of the DB constraint).

---

## Test 1b — Duplicate detection via DevTools replay (more reliable than double-click)

If the double-click timing is fiddly, this is a more deterministic way to get the exact same request twice:

1. Click **🍳 Cook This** once normally, let it complete successfully.
2. In the Network tab, find that `/cook` request. Right-click it → **Copy → Copy as fetch** (Chrome) or **Resend** (Firefox).
3. Paste the copied `fetch(...)` call into the DevTools **Console** and run it — this resends the *exact same* request body, including the same `cookSessionId`, byte-for-byte.
4. Check the response in the console (it's a Promise — `await` it or `.then(r => r.json()).then(console.log)`).

**Check:** same as Test 1 — `200 ok: true`, no double-deduction, one `pantry_events` row for that key.

---

## Test 2 — Genuine conflict (same key, different payload)

This simulates a bug or a malicious client reusing a key for a *different* request — canon requires this to be rejected, not silently accepted.

**Steps:**
1. Cook once normally, let it succeed. In the Network tab, copy the request as fetch (same as Test 1b, step 2-3) but **before running it**, edit the pasted command in the console: change `"servings"` to a different number (e.g. `1` → `2`) while leaving `cookSessionId` untouched.
2. Run the edited fetch call in the console.

**Check:**
- Response status: **`409`**
- Response body: `{ "error": "Idempotency conflict", "message": "Idempotency conflict: key \"...\" was already used with a different request" }`
- Nothing in the pantry should have changed from this second call — quantity stays exactly where Test 2's first (successful) call left it.

**PASS:** `409` returned, message mentions "Idempotency conflict," no pantry mutation happened from the conflicting call.
**FAIL:** request returns `200` (conflict wasn't detected — the exact failure mode canon's "reject on mismatch" rule exists to prevent); or it 500s instead of a clean 409; or the pantry was mutated a second time despite the conflict.

---

## Test 3 — Race condition fallback (optional, hard to test manually)

`isUniqueConstraintViolation()` is a last-resort guard for two *truly concurrent* requests both passing the app-level check before either commits — this needs actual parallel requests (e.g. a small script firing two `fetch()` calls with `Promise.all` and the same `cookSessionId`) to exercise reliably; a human clicking a mouse usually isn't fast enough to trigger it. If you want to test this specifically, ask for a small script rather than trying to do it by hand — otherwise this is reasonably covered by code review (the composite unique index from ticket 2 guarantees the DB itself will never accept two rows with the same key, regardless of what the app-level check does).

---

## Overall pass/fail

**Ticket 4 passes** if Test 1 (or 1b) and Test 2 both pass. Test 3 is optional/lower-priority given the difficulty of manually triggering a true race.

Remember: this only covers the **cook flow**. If you later test idempotency on the manual pantry-add, receipt-confirm, or shopping-purchase endpoints, it won't behave this way yet — those still generate random placeholder keys with no validation (flagged as a known gap in ticket 4's original summary).
