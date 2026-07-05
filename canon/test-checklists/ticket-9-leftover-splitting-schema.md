# Ticket 9 Test Checklist — parent_leftover_id Schema Readiness

## What this verifies

Ticket 9 added a nullable `parent_leftover_id` column to `leftovers` (per canon §5.7), so the schema won't block building leftover-splitting later (canon §3.13) — splitting itself is deferred to Phase 1b (§11.5) and **no route or UI logic uses this column at all**. This checklist verifies the column exists correctly and — just as importantly — that adding it didn't break existing leftover creation (both the manual `/leftovers` flow and the cook-flow-created leftovers from ticket 6).

---

## Prerequisites

Real `DATABASE_URL`, direct SQL access. Optionally the app running to sanity-check existing leftover creation still works (regression check).

---

## Test 1 — Schema push succeeds and column exists

**Steps:**
1. Run `pnpm --filter @workspace/db run push` if you haven't already applied this schema change.
2. Query:
   ```sql
   select column_name, data_type, is_nullable
   from information_schema.columns
   where table_name = 'leftovers' and column_name = 'parent_leftover_id';
   ```

**Expected:** one row — `parent_leftover_id`, `text`, `is_nullable = YES`.

**PASS:** column exists, nullable, no default required.
**FAIL:** column missing, or `is_nullable = NO` (would break every existing leftover-creation path, since nothing sets this field).

---

## Test 2 — Regression check: leftover creation still works without setting this column

This is the more important test — a nullable column should never break existing inserts that don't reference it. Two creation paths exist in this app; check both.

**Path A — manual leftover creation** (whatever UI/flow calls `POST /api/leftovers`):
1. Create a leftover manually through the app.
2. Confirm it's created successfully and appears in the Leftovers tab, with `parent_leftover_id` left as `null` in the database:
   ```sql
   select id, meal_name, parent_leftover_id from leftovers order by created_at desc limit 1;
   ```

**Path B — cook-flow leftover creation** (from ticket 6): follow `ticket-6-cook-to-leftover.md` Test 1 (cook a recipe with "Save as leftovers" > 0) and confirm the resulting leftover also has `parent_leftover_id = null`.

**PASS:** both paths still create leftovers successfully, `parent_leftover_id` is `null` on both (nothing sets it, as expected).
**FAIL:** either creation path errors out (would mean the schema change somehow broke an insert — check for a stray `NOT NULL` or unexpected default), or `parent_leftover_id` has an unexpected non-null value.

---

## Overall pass/fail

**Ticket 9 passes** if Tests 1 and 2 both pass. There is no splitting feature to test — that's explicitly deferred. If you want to confirm the column would actually work for its intended future purpose, you could manually set it via SQL (`update leftovers set parent_leftover_id = '<another leftover's id>' where id = '<a leftover id>';`) and confirm nothing in the app breaks when a row happens to have this field populated — but that's optional forward-looking curiosity, not something this ticket requires.
