# Ticket 8 Test Checklist — Reconcile Event Metadata

## What this verifies

Ticket 8 didn't require any new code — it was a verification pass confirming the only place that creates a `reconcile` event (`PATCH /api/pantry/:id`, added back in ticket 3) already sets `metadata.source_type`/`actor_type` per canon §11.8. This checklist re-confirms that at runtime, against a real database.

## Important finding before you start

**There is no button in the app that calls `PATCH /api/pantry/:id`.** I checked the frontend (`artifacts/pantry-app/src/pages/pantry/index.tsx` and everywhere else that references `/api/pantry`) — it only has GET (list), POST (create), and DELETE. Editing an existing pantry item's quantity/location/expiry isn't wired to any UI element at all. This is a separate, pre-existing product gap (not something any of these 9 tickets were scoped to fix) — flagging it here since it means you can't test this ticket by clicking around the app; you have to call the endpoint directly.

---

## Prerequisites

Logged into the app in your browser (so DevTools console `fetch()` calls carry your session cookie automatically — same-origin requests don't need a separate auth header). A pantry item's real `id` to test against (find one via the Pantry tab, or `select id from pantry_items limit 1;`). Direct DB access for the verification query.

---

## Test 1 — Call PATCH directly and confirm the Reconcile event

**Steps:**
1. With the app open and logged in, open DevTools Console.
2. Run (replace `<pantry-item-id>` with a real id):
   ```js
   fetch('/api/pantry/<pantry-item-id>', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ quantity: 7 }),
   }).then(r => r.json()).then(console.log)
   ```

**Check the response (printed in console):**
- The updated pantry item, with `quantity` now `"7"`.

**Check the database:**
```sql
select event_type, reason_code, metadata
from pantry_events
where pantry_item_id = '<pantry-item-id>'
order by created_at desc
limit 1;
```

**Expected:**
- `event_type = 'reconcile'`
- `reason_code = 'quantity_adjustment'` (since you changed `quantity` — ticket 3's field-priority logic: quantity > storageArea > expiryDate > generic `user_correction`)
- `metadata` contains, at minimum:
  ```json
  {
    "source_type": "manual_correction",
    "actor_type": "user",
    "reason_code": "quantity_adjustment",
    "actor": "<your user id>",
    "prior_state_snapshot": { ...the item before the edit... },
    "corrected_state_snapshot": { "quantity": "7" }
  }
  ```

**PASS:** `event_type` is `reconcile`, and `metadata.source_type`/`metadata.actor_type` are both present and match the values above.
**FAIL:** either field missing from metadata, or `event_type` isn't `reconcile`, or `reason_code` doesn't match the field you actually changed.

---

## Test 2 — Different field changes produce different reason_code

Repeat Test 1 but PATCH a different field to confirm the priority logic:

- `{ "storageArea": "freezer" }` (with quantity untouched) → expect `reason_code = 'location_change'`
- `{ "expiryDate": "2026-08-01" }` (with quantity and storageArea untouched) → expect `reason_code = 'freshness_override'`
- `{ "notes": "test" }` (none of the above three touched) → expect `reason_code = 'user_correction'` (the generic fallback)

**PASS:** each variant produces the expected `reason_code`.
**FAIL:** wrong `reason_code` for any of these, or `source_type`/`actor_type` missing on any of them.

---

## Overall pass/fail

**Ticket 8 passes** if Tests 1 and 2 both confirm `source_type`/`actor_type` are always present and `reason_code` follows the documented priority. Since this ticket required no code changes, a pass here is really confirming ticket 3's original work still holds, not verifying anything new.

**Separate item worth raising with Mike, not part of this ticket's pass/fail:** should "edit pantry item" get a real UI? Right now the only way to trigger a Reconcile event is by calling the API directly.
