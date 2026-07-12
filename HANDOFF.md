# Handoff — Barcode Scanner → Pantry Save Flow

## 1. What we were working on

Started by tracing the barcode scanner feature end-to-end: camera decode →
external product lookup → confirm screen → `POST /api/pantry` → save into
the `pantry_items` table. Goal was to find every place the chain could
break between "barcode decoded" and "row saved with the right data."

Scope expanded over the session to also cover: camera scan speed/config,
a quantity-input bug that turned out to exist in both the scan confirm
screen and the manual "Add Item" dialog, three scanner UX requests
(quantity auto-select, remember last camera, a Manual Entry tab), and
finally a pantry item edit flow (tap an item to edit/delete it), which
turned out to just need frontend wiring onto a backend endpoint that
already existed.

Full flow, in order:
1. `artifacts/pantry-app/src/pages/pantry/scan.tsx` — camera scan (html5-qrcode)
   or manual entry → `lookupBarcode()` → confirm screen → `addItem` mutation
2. `artifacts/pantry-app/src/pages/pantry/index.tsx` — manual "Add Item"
   dialog, same `POST /api/pantry` endpoint, separate `form` state
3. `artifacts/api-server/src/routes/pantry.ts` — `GET /external-barcode/:barcode`
   (lookup) and `POST /` (save)
4. `artifacts/api-server/src/lib/barcodeService.ts` — queries UPCItemDB, then
   Open Food Facts, as the external product data source
5. `artifacts/api-server/src/lib/household.ts`, `pantryEvents.ts`,
   `idempotency.ts` — household resolution, event logging, idempotency check
6. `lib/db/src/schema/pantry.ts` — `pantryItemsTable` (has a `barcode` column)

## 2. Fixes applied this session

All five fixes below typechecked clean (`tsc --noEmit` on both `api-server`
and `pantry-app`) but **none have been verified in a running browser** —
no `DATABASE_URL` in this environment. See Section 3.

**Fix 1 — barcode never reached the DB.** Two breaks, both needed together
(fixing only one would have left the barcode silently lost):
- `scan.tsx` (`addItem` mutation body, ~line 78): added
  `barcode: foundProduct.barcode` to the POST body — it was sitting in
  component state but never sent.
- `api-server/routes/pantry.ts` (`pantryPostSchema`, ~line 31): added
  `barcode: z.string().optional()`. Zod strips unlisted keys, so even
  after the frontend fix the field was being discarded server-side.

**Fix 2 — 400 after scanning a nameless product.** Root cause in
`barcodeService.ts`: both external-lookup "found" gates checked only that
a record existed, not that it had a usable name. Open Food Facts records
are frequently missing `product_name`; a nameless match slipped through
as "found," `JSON.stringify` dropped the `undefined` name key, and the
backend's `name: z.string().min(1)` rejected it with a 400.
- `if (item)` → `if (item?.title)` (line 16)
- `data.status === 1 && data.product` → `data.status === 1 && data.product?.product_name` (line 33)

This routes nameless matches into the existing "Product not found — add it
manually" path instead of producing a partial product that fails
validation.

**Fix 3 — scanner camera resolution.** `scan.tsx` `videoConstraints`
(~line 145-146) changed from targeting 1920x1080 to targeting 1280x720,
to see if a smaller frame decodes faster:
- `width: { min: 1280, ideal: 1920 }` → `width: { min: 1280, ideal: 1280 }`
- `height: { min: 720, ideal: 1080 }` → `height: { min: 720, ideal: 720 }`

Used `min`/`ideal` rather than `exact` deliberately — `Html5QrcodeScanner`'s
`render()` returns `void` and swallows `getUserMedia` constraint errors
internally (confirmed by reading the library source), so an `exact`
constraint that a camera can't satisfy would fail with no way for our code
to catch it and retry. `min`/`ideal` lets the browser degrade gracefully
with no retry logic needed.

Other scanner properties requested during this session (`fps: 15`, a
center-box `qrbox`, `focusMode: 'continuous'`, the 5-format whitelist
including `UPC_E`) were already present in the code — no change was
needed for those. A 1500ms post-scan cooldown was requested but not
built: the current one-shot-per-mount design (`hasScannedRef` guard +
`s.pause(true)` + `s.clear()`) already permanently stops scanning after
one success and tears the camera down, so there's no second read for a
cooldown timer to guard against. Adding one as literally described would
be dead code. Building an actual "stay open and re-arm after 1500ms for
back-to-back scans" feature would be a real behavior change, not a config
tweak — not done, needs a decision first.

**Fix 4 — quantity `.5` silently became empty string (scan.tsx).**
Confirmed via a temporary `console.log` (added, used to reproduce, then
removed) that `<Input type="number">` discards values like `.5` (no
leading digit) at the DOM level — some browsers treat it as an invalid
number and report `e.target.value` as `""`. `scan.tsx` (~line 325-334):
switched the Quantity input from `type="number"` to `type="text"` +
`inputMode="decimal"`, with a regex guard (`/^\d*\.?\d*$/`) replacing the
browser's native filtering.

**Verified live in browser by user — works.**

**Fix 5 — same quantity bug, plus a more severe one, in the manual "Add
Item" dialog (`pantry/index.tsx`).**
- Same input fix as Fix 4, applied to `pantry/index.tsx` ~line 113.
- Separate, more severe bug found alongside it: the `addItem` mutation
  (~line 62) spread `form` directly into the POST body with no `Number()`
  conversion anywhere in the file (unlike `scan.tsx`, which already did
  `Number(confirmForm.quantity)` at its send site). Since the backend
  schema is `quantity: z.number().optional()` — a strict type check, not
  `z.coerce.number()` — this form was sending `quantity` as a string on
  *every* submission, which should fail validation regardless of the
  decimal-input issue. Fixed by changing the POST body to
  `{ ...data, quantity: Number(data.quantity), idempotencyKey: addRequestId }`.

**Verified live in browser by user — works.** This was the highest-priority
item to check, since the analysis implied manual "Add Item" was 400ing on
essentially every use before this fix.

**Fix 6 — quantity fields don't auto-select on focus.** Added
`onFocus={e => e.target.select()}` to both quantity inputs (`scan.tsx`
confirm screen and `pantry/index.tsx` Add Item dialog), so tapping into
the field highlights the existing value instead of requiring a manual
delete first. Trivial once both fields were already `type="text"` (Fixes
4/5) — `.select()` behaves consistently on text inputs, unlike the native
`type="number"` input's inconsistent behavior that caused Fixes 4/5 in
the first place.

**Fix 7 — remembered camera choice was being wiped on every scanner
open.** User asked for "remember selected camera between sessions,"
expecting custom `localStorage` code. Investigation found
`Html5QrcodeScanner` already ships this feature internally
(`PersistedDataManager`, key `HTML5_QRCODE_DATA`) — it saves the chosen
camera ID when Start is clicked and auto-restores it next render, gated
behind a `rememberLastUsedCamera` config flag. Our config never set that
flag, so the library's own constructor logic
(`if (config.rememberLastUsedCamera !== true) { this.persistedDataManager.reset(); }`)
was wiping the saved ID on every single construction. Fix was one line:
`rememberLastUsedCamera: true` added to the scanner config in `scan.tsx`
(~line 131). No custom persistence code needed or written.

User later reported "not persisting" after this shipped. Hypothesis was
that the scanner auto-starts on a single-camera device (true —
`cameraSelectUi.hasSingleItem()` auto-clicks Start) so "there's nothing
for the library to save." Traced the source further: that's not actually
correct — the Start button's click handler calls
`persistedDataManager.setLastUsedCameraId(cameraId)` unconditionally,
whether the click was human or the library's own programmatic auto-click.
The save side works either way. The more likely failure mode (not
confirmed, no live device access): the *restore* side only re-applies a
saved ID if `cameraSelectUi.hasValue(cameraId)` — i.e. the same device ID
still appears in the current camera list — otherwise the library itself
calls `resetLastUsedCameraId()`. Some mobile browsers rotate
`MediaDeviceInfo.deviceId` per top-level session as a fingerprinting
mitigation, which would defeat this regardless of our config. User
reported back simply "working" without specifying which explanation it
was — **treat as confirmed working for now**, but if it regresses, check
devtools → Application → Local Storage → `HTML5_QRCODE_DATA` across a
real close/reopen to see whether the saved ID itself survives or whether
it's a device-ID-stability issue (which would need a different fix:
remembering `facingMode` intent instead of a specific `deviceId`).

**Fix 8 — Manual Entry tab.** User asked to "add a third tab between
[Scan and Add Item] called Manual Entry," assuming a two-tab structure
already existed. It didn't: `Scan` (`/pantry/scan`) and `Add Item` (a
modal on `/pantry`) are on two different routes, not tabs on one screen,
and there's no `Tabs` usage anywhere in the pantry/scan flow (there is a
`components/ui/tabs.tsx` primitive, used elsewhere in the app — recipes,
deals, etc.). Also, manual barcode entry already existed functionally on
`scan.tsx` — an inline "or enter manually" section below the Start Camera
button, calling the same `lookupBarcode()` the camera uses. So this Fix
is a UI reorg, not new lookup logic: the `scan.tsx` idle-state layout was
restructured into a real `Tabs` (`Scan` | `Manual Entry`), reusing the
existing `manualBarcode` state and `lookupBarcode()` call as-is. `Add
Item` was intentionally left alone as a separate modal on `/pantry` — a
literal 3-tab bar spanning both routes was decided against.

**Fixes 6-8 committed and pushed** as `8b6ca66` — not yet verified live.

**Fix 9 — pantry item list was tap-dead; added an edit/delete flow.**
User reported tapping a pantry item did nothing. Found the row (
`pantry/index.tsx`, item `.map()`) was a plain `<div>` with no `onClick` —
only its "Remove" button did anything. Checked the backend before
building anything: `PATCH /api/pantry/:id` already existed, fully built
(event-sourced, idempotent, RC2 canon reason-code logic), with a comment
noting *"No UI calls this endpoint at all yet... added for API
completeness/whenever an edit UI gets built."* So this was pure frontend
wiring, no backend work needed:
- New `editingItem`/`editForm` state; tapping a row calls `openEdit(item)`,
  which pre-fills the form and opens a `Dialog` (matching the existing Add
  Item dialog's component, not `Sheet`) with Quantity, Category, Storage,
  Brand, Expiry Date — the five fields the user asked for (not
  name/unit).
- New `updateItem` mutation → `PATCH /api/pantry/:id`, `Number()`-coercing
  quantity same as Fix 5.
- A Delete button inside the dialog reuses the existing `deleteItem`
  mutation; its `onSuccess` now also closes the dialog.
- Along the way, found `deleteItem`'s `mutationFn` never checked
  `res.ok` — the same fetch()-doesn't-reject-on-4xx/5xx class of bug as
  the original `addItem` bug, meaning a failed delete (404, network
  hiccup) would still toast "Item removed." User confirmed fixing this
  too, since the new dialog's Delete button reuses this same mutation.
- Remove button on the row gets `e.stopPropagation()` so it doesn't also
  trigger the row's new `onClick`.

**Committed and pushed as `c3222c0`.** **Verified live in browser by
user — works.**

## 3. Next step

User has since verified some of this live in a running browser (outside
this session — this environment still has no `DATABASE_URL`). Status:
1. Scan a real barcode → confirm the item saves with the barcode field
   populated (Fix 1). **Not yet confirmed.**
2. Find or fake a barcode that resolves to a nameless Open Food
   Facts/UPCItemDB record → confirm it now falls into "not found — add
   manually" instead of 400ing (Fix 2). **Not yet confirmed.**
3. Scanner responsiveness with the 1280x720 target — user reported
   "scanner is working." **Confirmed working**, though no side-by-side
   timing vs. the old 1920x1080 target was done.
4. Scan confirm screen, quantity `.5` → **Confirmed working** by user.
5. Manual "Add Item" dialog, quantity (any value, including `.5`) →
   **Confirmed working** by user. This was the highest-priority item
   (see Fix 5) since the analysis implied it was 400ing on essentially
   every use before the fix.
6. Quantity auto-select on focus (scan.tsx + pantry/index.tsx) →
   **Not yet confirmed.**
7. Remembered camera choice across a real app close/reopen → user
   reported "working" but didn't confirm which mechanism (see Fix 7
   write-up) — **treat as working, but re-check via devtools localStorage
   if it regresses.**
8. Manual Entry tab on `/pantry/scan` → **Not yet confirmed** (reorg of
   already-working lookup logic, so risk is low, but layout/tab-switching
   itself hasn't been eyeballed).
9. Pantry item edit flow — tap an item, edit fields, Save (PATCH) and
   Delete both work, dialog closes correctly → **Confirmed working** by
   user ("flow worked fine").

Remaining fully-unconfirmed items: 1, 2 (barcode persistence, nameless-
product 400), 6, 8. Item 7 has an ambiguous "working" confirmation.

## 4. Important file paths

- `artifacts/pantry-app/src/pages/pantry/scan.tsx` — scanner UI
  (`Html5QrcodeScanner` config incl. `rememberLastUsedCamera`), lookup
  call, idle state now a `Tabs` (Scan | Manual Entry) instead of a
  stacked layout, confirm screen (Quantity input with auto-select), save
  mutation
- `artifacts/pantry-app/src/pages/pantry/index.tsx` — manual "Add Item"
  dialog (Quantity input with auto-select), `addItem` mutation; pantry
  item list row now has `onClick={() => openEdit(item)}`; new Edit
  dialog (`editingItem`/`editForm` state, `openEdit()`) with `updateItem`
  mutation (`PATCH /api/pantry/:id`) and a Delete button reusing
  `deleteItem` (now with a proper `res.ok` check)
- `artifacts/pantry-app/src/pages/inventory/index.tsx` — displays
  `item.barcode` in the pantry list (line ~35)
- `artifacts/api-server/src/routes/pantry.ts` — `pantryPostSchema` (~line 17),
  `POST /` handler (~line 55), `pantryPatchSchema` (line 35, `.partial()`
  of the post schema), `PATCH /:id` handler (line 141, event-sourced
  reconcile logic, now finally called by the pantry item edit dialog as
  of Fix 9), `DELETE /:id` handler (line 245), `GET /barcode/:barcode`
  (unused/orphaned — no frontend caller), `GET /external-barcode/:barcode`
- `artifacts/api-server/src/lib/barcodeService.ts` — `lookupBarcode()`,
  external API calls (UPCItemDB line 16, Open Food Facts line 33)
- `artifacts/api-server/src/app.ts` — Express app setup, confirms
  `express.json()` is mounted before routes (ruled out as a cause during
  diagnosis)
- `artifacts/api-server/src/middlewares/requireAuth.ts` — auth middleware
  (ruled out as a 400 source; only returns 401/403/500)
- `lib/db/src/schema/pantry.ts` — `pantryItemsTable`, has `barcode` column
  (line 9)

## 5. Errors seen and how we diagnosed them

**Error 1 (fixed): scanned items saved without a barcode.**
Diagnosed by manually tracing the full flow file-by-file from the decode
callback through to the DB insert, reading each file in order rather than
guessing. Found two independent drop points: the frontend never included
`barcode` in the request body, and the backend Zod schema would have
stripped it even if sent. Confirmed via `grep` that the `barcode` column
existed in the DB schema and that no frontend code called the unused
`GET /barcode/:barcode` duplicate-check route.

**Error 2 (fixed): `POST /api/pantry` returns 400 after a scan.**
Diagnosis method:
1. Read the current `pantryPostSchema` fresh to confirm exact
   required/optional fields and types.
2. Read the current `scan.tsx` request body fresh to confirm exact
   field names/types being sent.
3. Compared them side by side — field names and types matched, so the bug
   wasn't a simple typo/type mismatch.
4. Ruled out infrastructure causes by checking `app.ts` (confirmed
   `express.json()` is mounted globally before `/api` routes) and
   `requireAuth.ts` (confirmed it only ever returns 401/403/500, never 400).
5. Traced backward from the one required field (`name`) to find where it
   could end up missing despite passing the frontend's "product found"
   check — landed on `barcodeService.ts`'s two lookup branches not
   validating that a name field was actually present before treating the
   external API result as a successful match.

Note: an attempt to empirically verify the Zod parsing behavior with a
standalone Node script was made but the tool call was rejected by the
user, so this diagnosis was from static code reading only, not a live
test.

**Error 3 (fixed): quantity `.5` (no leading zero) caused a validation
error on `quantity`, not `name`.**
User reported the exact failing field and value up front. Diagnosis:
1. Read `pantryPostSchema` fresh — `quantity: z.number().optional()`.
2. Read `scan.tsx`'s send site — `quantity: Number(confirmForm.quantity)`.
   `Number(".5")` evaluates to `0.5`, a valid number, so the type coercion
   itself wasn't the problem — ruled out by static reading alone.
3. Added a temporary `console.log` right before the fetch call, logging
   `confirmForm.quantity` (raw + typeof) and `Number()` of it, and asked
   the user to reproduce by typing `.5` in a running browser and reporting
   the console output — this is the "test assumptions with a small
   experiment" step, since a native-input DOM quirk can't be confirmed by
   reading source alone.
4. User confirmed: the raw value was not `".5"` — the native
   `type="number"` input's own validity handling discards it before
   `onChange` ever sees it, consistent with known cross-browser behavior
   for partial decimals on `<input type="number">`.
5. Fixed by replacing the native number input with `type="text"` +
   `inputMode="decimal"` + a regex guard, removing the browser's native
   filtering as the point of failure. Temporary debug log removed after
   the fix was applied.

**Error 4 (fixed): same input bug in `pantry/index.tsx`, plus a second,
independent bug found while checking for it.**
User asked to check the manual "Add Item" dialog for "the same
`type="number"` issue" (flagged as an open item back in Error 3's
diagnosis). Found the same input pattern at line 113 — same fix applied.
While tracing the send path to confirm the fix would be sufficient there
too, found that this file's mutation never coerced `quantity` to a number
at all (`{ ...data, idempotencyKey: addRequestId }`, no `Number()`
anywhere), unlike `scan.tsx` which already did this at its send site. Not
something the user asked about directly — surfaced by reading the full
send path rather than only patching the reported symptom.

**Error 5 (resolved, ambiguous confirmation): remembered camera not
persisting across sessions, after Fix 7 shipped.**
User supplied their own hypothesis (auto-start on single-camera devices
means "nothing to save"). Rather than building a fix on top of an
unverified hypothesis, read the library's actual click-handler and
camera-list-render code paths to check it against source. Found the
hypothesis's conclusion didn't hold — the save call fires regardless of
auto vs. manual start — but surfaced a more plausible real mechanism
(device ID instability across browser sessions on the restore side) that
static reading alone couldn't confirm or rule out. Proposed a concrete
devtools check (compare `HTML5_QRCODE_DATA` in Local Storage before/after
a real close-reopen) rather than guessing at a fix. User replied "working"
without saying which explanation applied — logged as resolved-but-
ambiguous rather than assumed confirmed, see Fix 7 and Next Step item 7.

**Note on request hygiene this session:** two user messages turned out to
be paste mix-ups unrelated to the actual codebase — a line referencing
`HtmlSqrcodeSupportedFormats.QR_CODE` (typo'd identifier, not present
anywhere in the repo, confirmed via repo-wide `grep` and `git diff`) and a
verbatim repeat of an already-completed request. Both were flagged and
confirmed as mix-ups before any action was taken, rather than acted on
blindly.
