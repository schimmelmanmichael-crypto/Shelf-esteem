# Ticket 7 Test Checklist — GoalProfile Table (Schema Only)

## What this verifies

Ticket 7 added the `goal_profiles` table (`lib/db/src/schema/goal-profile.ts`) — schema only, per canon §11.9/§5.8. **No feature in the app reads or writes this table yet** — there is no UI to click through. This checklist verifies the schema itself landed correctly in the actual database, not any user-facing behavior.

---

## Prerequisites

A real `DATABASE_URL` and the ability to run `pnpm --filter @workspace/db run push` (this project uses Drizzle push, not migration files — see root `CLAUDE.md`/canon `ops-notes.md`). Direct SQL access (`psql`, a GUI client, or Railway's query console).

---

## Test 1 — Schema push succeeds

**Steps:**
1. Run `pnpm --filter @workspace/db run push`.

**Check:**
- Command completes without errors.
- Drizzle's push output mentions creating (or already having) a `goal_profiles` table.

**PASS:** clean push, table created.
**FAIL:** push errors out, or silently doesn't mention `goal_profiles` at all (check you're pointed at the right `DATABASE_URL`).

---

## Test 2 — Table structure matches the schema

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'goal_profiles'
order by ordinal_position;
```

**Expected columns:**
| column | type | nullable | default |
|---|---|---|---|
| `id` | text | NO | — |
| `household_id` | text | NO | — |
| `mode` | text | NO | `'balanced'::text` |
| `created_at` | timestamp | YES | `now()` |
| `updated_at` | timestamp | YES | `now()` |

**PASS:** matches above.
**FAIL:** any column missing, wrong type, or wrong nullability.

---

## Test 3 — Unique constraint on household_id actually works

Canon §11.9 requires "one active GoalProfile per Household." This is enforced via a unique constraint on `household_id`, not just application logic — verify it holds even if you tried to bypass the app entirely.

**Steps:**
1. Pick a real household id from your dev database (`select id from households limit 1;`).
2. Insert a row:
   ```sql
   insert into goal_profiles (id, household_id, mode) values (gen_random_uuid()::text, '<household id>', 'balanced');
   ```
3. Try to insert a **second** row for the **same** household id:
   ```sql
   insert into goal_profiles (id, household_id, mode) values (gen_random_uuid()::text, '<same household id>', 'save_money');
   ```

**Check:**
- Step 2 succeeds.
- Step 3 **fails** with a unique constraint violation (something like `duplicate key value violates unique constraint`).

**PASS:** second insert is rejected by the database itself.
**FAIL:** second insert succeeds — the unique constraint isn't actually there or isn't working, meaning a household could end up with two "active" goal profiles, contradicting canon §11.9.

**Cleanup:** `delete from goal_profiles where household_id = '<household id>';` if you don't want test data lingering.

---

## Test 4 — Mode defaults to 'balanced'

```sql
insert into goal_profiles (id, household_id) values (gen_random_uuid()::text, '<a different household id you haven''t used yet>');
select mode from goal_profiles where household_id = '<that household id>';
```

**Expected:** `mode` is `'balanced'` even though it wasn't specified in the insert.

**PASS:** defaults correctly.
**FAIL:** `mode` is `null` or something unexpected.

---

## Overall pass/fail

**Ticket 7 passes** if Tests 1-4 all pass. There is no application-level behavior to verify beyond this — remember that nothing in the app currently creates, reads, or displays a GoalProfile. If you're expecting to see something related to "goals" in the UI, that's a separate, not-yet-built feature, not something this ticket was ever meant to add.
