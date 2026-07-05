# SHELF ESTEEM CANON v2.0 RC2
Status: Release Candidate - Approved for build planning
Generated: 2026-07-02
Revision: RC2 document-level clarification pass
Product Owner: Mike Schimmelmann

## Release Note

Shelf Esteem Canon v2.0 RC2 supersedes Canon v1.0 RC1 for architecture, implementation planning, and Claude Code work.

This version incorporates:
- Canon v1.0 RC1
- ADR-001 through ADR-008
- ADR-023
- Phase 1 Implementation Directive
- Architecture Stress Test verdict: APPROVE WITH CHANGES
- Product-owner correction: mascot name is SHELFY

If Canon v2.0 RC2 conflicts with prior chats, handoff docs, task lists, or RC1 language, Canon v2.0 RC2 wins unless superseded by a later approved canon version.

---

# SECTION 0 - GOVERNANCE

## 0.1 Purpose

Shelf Esteem Canon is the authoritative source of truth for product, architecture, UX, data, implementation, and roadmap decisions related to Shelf Esteem.

If chat history, handoff documents, ADRs, implementation, or older canon versions conflict with this document:

**Canon v2.0 RC2 wins.**

## 0.2 Versioning

Shelf Esteem Canon uses semantic versioning.

### Major Version
Breaking architecture changes or major source-of-truth changes.

Examples:
- Pantry state model redesign
- Inventory event model changes
- Household ownership model changes
- Major data migration strategy changes

Requires:
- ADR
- migration notes
- changelog

### Minor Version
Feature additions without breaking architecture.

Requires:
- canon update
- changelog

### Patch Version
Clarifications and documentation fixes.

No architecture change.

## 0.3 Change Control

No core architectural change becomes canonical until documented in an approved ADR and reflected in current canon.

## 0.4 Authority Hierarchy

When conflicts exist:

1. Current Canon
2. Current Canon Patch Directives
3. Approved ADRs
4. Latest official handoff docs
5. Archived chats

## 0.5 Product Philosophy Priorities

Shelf Esteem prioritizes:

1. Trust
2. Simplicity
3. Practical intelligence
4. Waste reduction
5. Money savings

## 0.6 Implementation Governance

Claude Code must not silently redesign architecture.

If implementation conflicts with canon, Claude must report:
- conflict
- risk
- recommendation
- migration path

before major changes.

---

# SECTION 1 - VISION & MISSION

## 1.1 Product Definition

Shelf Esteem is a kitchen intelligence platform centered on pantry truth.

Shelf Esteem helps households:
- save money
- reduce food waste
- make smarter cooking decisions
- make smarter shopping decisions

Shelf Esteem combines:
- Pantry intelligence
- Meal planning intelligence
- Shopping intelligence
- Freshness intelligence
- Substitution intelligence
- Household intelligence
- Recommendation intelligence
- Price intelligence

Shelf Esteem is not merely an inventory tracker. It is a decision engine for household food management.

## 1.2 Core Promise

Primary promise:

**Stop buying what you already own.**

Secondary promises:
- Waste less food
- Save more money
- Reduce kitchen stress
- Make better meal decisions
- Increase pantry awareness

## 1.3 What Shelf Esteem Is

Shelf Esteem IS:
- pantry management and inventory intelligence
- meal planning from pantry reality
- shopping intelligence
- waste reduction system
- price intelligence
- household-aware recommendations

## 1.4 What Shelf Esteem Is Not

Shelf Esteem is NOT:
- recipe discovery platform
- food blog
- generic grocery list app
- meal kit service
- calorie-counting diet app

Recipes exist to support planning and execution.

## 1.5 Target User

Primary user:

Budget-conscious Millennial parents, approximately ages 28-42, managing household food decisions.

Pain points:
- duplicate buying
- food waste
- dinner fatigue
- budget pressure
- household preference conflicts

Secondary users:
- singles
- roommates
- retirees
- caregivers

## 1.6 Mission

Help households use what they already have before buying more.

Every feature should reinforce:
- inventory awareness
- waste reduction
- money savings
- reduced decision fatigue

## 1.7 Weekly Rhythm

Recommended rhythm:
- Friday: Plan My Week
- Saturday: Shop
- Sunday: Cook / Prep / Leftovers
- Monday-Thursday: Execute / Consume / Adjust

This rhythm is recommended, not mandatory.

## 1.8 Accessibility

Shelf Esteem is visual-first.

All critical functionality must be usable without audio.

Audio is optional only. Core workflows cannot depend on:
- sound
- speech
- voice commands

## 1.9 Mascot - SHELFY

The mascot name is **SHELFY**.

Design:
- wooden pantry unit
- cartoon eyes
- gloves
- sneakers
- thumbs up

Personality:
- helpful
- warm
- practical
- lightly funny
- never snarky
- never shaming

SHELFY communicates visually.

Shelf Esteem should feel like:
- smart kitchen buddy
- helpful assistant
- encouraging coach

Never:
- nagging parent
- guilt machine

---

# SECTION 2 - PRODUCT PRINCIPLES

## 2.1 Trust Over Fake Precision

Inventory should be trustworthy, not artificially precise.

Precise examples:
- eggs
- milk
- chicken breasts

Confidence/presence examples:
- chips
- crackers
- salsa
- spices

System supports precise, confidence, and presence tracking.

Foundation: ADR-008.

## 2.2 Reduce Friction Everywhere

Minimize required user input.

Prioritize:
- barcode scanning
- smart defaults
- autofill
- inference
- batch actions
- progressive onboarding

Avoid:
- excessive forms
- repetitive prompts
- forced setup before value

Every extra tap spends trust.

## 2.3 No Shame

Never use guilt or shame.

Bad:
"You wasted $24 this week."

Good:
"You saved 82% of at-risk food."

Warnings must be calm, actionable, and supportive.

## 2.4 Explain Recommendations

Recommendations must explain why.

Example:
Recommended because:
- bananas are overripe
- 90% pantry match
- estimated cost is $2.10 per serving

No black-box AI.

## 2.5 Visual Communication

Critical communication must be understandable visually.

Use:
- text
- icons
- color
- labels

## 2.6 Practical Intelligence

Intelligence must solve real household decisions.

Good AI answers:
- what should I cook?
- what expires soon?
- what should I buy?
- what saves money?

No novelty AI.

## 2.7 Interrupt Only When Valuable

Communicate only when interruption value exceeds attention cost.

Allowed:
- Kitchen Pulse
- critical spoilage alerts

Avoid:
- spam
- engagement bait
- nagging

## 2.8 Pantry Truth Drives Everything

Pantry state is foundational.

Core loop:

Pantry -> Meal Planner -> Shopping -> Checkout -> Pantry

## 2.9 Save Money First

Prioritize measurable household savings.

Savings sources:
- duplicate prevention
- waste reduction
- smarter shopping

## 2.10 Real Kitchens Are Messy

Design for messy human behavior.

System must tolerate:
- incomplete data
- forgotten logging
- substitutions
- pantry drift
- unpredictable consumption
- partial onboarding
- ad-hoc cooking
- manual corrections

Shelf Esteem must recover gracefully.

---

# SECTION 3 - CORE ARCHITECTURE

Shelf Esteem is composed of interconnected decision engines centered on pantry truth.

Core loop:

Pantry Engine
-> Meal Planner
-> Shopping Engine
-> Checkout Engine
-> Inventory Events
-> Pantry Engine

Supporting engines:
- Leftovers Engine
- Freshness Engine
- Substitution Engine
- Intelligence Engine
- Household Engine
- Price Intelligence Engine

## 3.1 Pantry Engine

Foundation of Shelf Esteem.

Responsibilities:
- track inventory
- track quantities
- track confidence
- track freshness
- support precise, confidence, and presence tracking

Pantry item attributes:
- quantity
- unit
- confidence level
- freshness strategy
- storage location
- tracking mode
- current state cache

Rule:

Pantry truth drives all downstream decisions.

## 3.2 Inventory Event Model - ADR-024

All pantry mutations occur via canonical inventory events.

Canonical event types:

1. Acquire
2. Consume
3. Transform
4. Discard
5. Reconcile

### Acquire
Food enters pantry.

Examples:
- grocery purchase
- restock
- gifted food
- migration backfill

### Consume
Food is used or eaten.

Examples:
- drank milk
- used flour
- ate leftovers
- cooked recipe ingredients

### Transform
Food becomes something else.

Examples:
- ingredients -> chili
- meal -> leftovers
- one leftover container split into multiple records
- freezer transition

### Discard
Food leaves pantry uneaten.

Examples:
- spoilage
- trash
- missed leftovers
- returned to store

### Reconcile
A correction event that makes event history reflect reality when actual state differs from expected state.

Examples:
- manual pantry correction
- admin repair
- migration cleanup
- user confirms an item is gone
- user confirms quantity/freshness is different

Reconcile exists to preserve auditability. Corrections must never be silent direct mutations.

## 3.3 Event Immutability

Inventory events are immutable and append-only.

Prior events must not be edited or deleted.

Corrections happen through new Reconcile events.

## 3.4 Pantry Items as Projection Cache

`pantry_items` remains a real table for fast reads.

However:

**Inventory Events are canonical truth.**

`pantry_items` is a synchronously updated projection/cache.

Rules:
- normal reads use `pantry_items`
- events are written first or in the same transaction
- projection updates occur synchronously inside the same transaction
- `pantry_items` must be rebuildable from events
- no direct writes to `pantry_items` are permitted without corresponding events

## 3.5 Deprecation of `pantry_deducted`

Legacy field `pantry_deducted` is deprecated as canonical truth.

Allowed:
- temporary migration compatibility
- temporary performance/cache use
- legacy safety during transition

Not allowed:
- permanent source of truth
- primary double-deduction protection

Double-deduction protection now comes from idempotency keys and event constraints.

## 3.6 Idempotency

Every user action that can mutate inventory must carry an idempotency key.

Required for:
- recipe cooking
- checkout commit
- leftover consumption
- manual pantry adjustments
- scan-driven additions

Example:
Cooking a recipe creates one cook-session ID. Duplicate requests with the same ID must not double-consume ingredients.

## 3.7 Transaction Rules

Inventory mutation groups must be atomic.

Checkout inventory commit:
- all Acquire events commit
- or none commit

Recipe execution:
- all Consume/Transform events commit
- or none commit

Partial commits are not allowed.

## 3.8 Meal Planner

Planning begins with pantry reality.

Responsibilities:
- weekly planning
- recipe feasibility
- substitution evaluation
- shopping gap detection
- recommendations

Recipe availability buckets:
- Ready Now
- Ready With Substitution
- One or Two Items Away

Missing ingredients do not disqualify recipes until substitution evaluation completes.

## 3.9 Shopping Engine

Purpose:

Close pantry gaps.

Flow:

Pantry -> Meal Planner -> Shopping List -> Checkout -> Pantry

Shopping list generated from:
- meal gaps
- low stock
- staples
- manual additions

Supports:
- planned purchases
- substitutions
- cart tracking

Price Scout is not Phase 1. It belongs to Price Intelligence Phase B.

## 3.10 Checkout Engine - ADR-025

Checkout finalizes purchases.

Flow:
1. Review cart
2. Commit inventory truth
3. Optional receipt processing

Checkout uses Dual Truth Model.

### Inventory Truth
What entered pantry.

Source:
- reviewed cart

Write path:
- separate transaction
- atomic
- event-driven

### Financial Truth
What was paid.

Sources:
- receipt
- price scout
- retailer data

Write path:
- separate transaction
- may be asynchronous
- failure must never roll back inventory truth

Rule:

Receipt parsing failure must never corrupt pantry state.

## 3.11 Receipt Discrepancy Handling

Receipt differences do not automatically mutate pantry.

If receipt says a different quantity than reviewed cart:
- log discrepancy
- optionally prompt user
- do not auto-adjust pantry

If receipt has item not in reviewed cart:
- prompt: "We found this on your receipt. Add to pantry?"
- user confirmation creates Acquire event

## 3.12 Leftovers Engine

Leftovers are first-class entities.

They are not returned ingredients.

Track:
- meal source
- servings remaining
- storage location
- created date
- use-by date
- cost per serving
- label print state

Lifecycle:

Cook -> Leftover Record -> Meal Plan -> Consume / Discard

Partial leftover consumption must generate Consume events referencing the Leftover entity.

`Leftover.servings_remaining` is a projection/cache, not event truth.

Discarding a leftover automatically creates a MissedOpportunity record.

## 3.13 Leftover Splitting

A leftover may be split into multiple child leftover records.

Example:
- 2 servings remain in fridge
- 4 servings move to freezer

Splitting is modeled with a Transform event and creates independent freshness/storage timelines.

This may be implemented after Phase 1 if not required for MVP, but the model must not block it.

## 3.14 Leftover Labels

Physical label printing and QR flows are Phase 6 hardware features.

Phase 1 may track leftover label fields, but printing is not required for MVP.

UI copy must not overpromise physical label accuracy because labels can drift from actual servings.

## 3.15 Freshness Engine - ADR-026

Shelf Esteem uses multiple freshness strategies.

Strategies:
- Hard Date
- Opened Countdown
- Soft Freshness
- Long Shelf
- Leftover
- Frozen modifier / transition rule

### Hard Date
Examples:
- dairy
- deli meat

### Opened Countdown
Examples:
- salsa
- milk
- sour cream

### Soft Freshness
Examples:
- bananas
- tomatoes
- berries

### Long Shelf
Examples:
- rice
- flour
- spices

### Leftover Strategy
Special leftover safety windows.

### Frozen Modifier / Transition
Freezing changes freshness rules.

When an item is frozen:
- storage_location changes to freezer
- freshness logic changes to freezer-appropriate thresholds
- event history records the transition
- quality degradation may continue even if safety window is extended

Frozen leftovers must not use the same safety window as fridge leftovers.

Basic freshness schema is required in Phase 1. Advanced freshness intelligence is deferred.

## 3.16 Utility States

Spoilage is not binary.

Food may retain secondary utility.

States:
- Prime
- Secondary Utility
- Discard

Example:
Bananas can move from raw eating to banana bread/smoothie/freezer use before discard.

Secondary Utility is optional per ingredient.

## 3.17 Substitution Engine - ADR-027

Substitution rules live in canonical ingredient data, not pantry items.

Supports:
- system substitutions
- household substitutions
- recipe overrides
- strength tiers

Strength tiers:
- Excellent
- Good
- Emergency

Household-level substitution preferences override canonical defaults.

Substitution evaluation should not chain indefinitely. Runtime may enforce single-hop substitution or max-depth protection.

Phase 1 requires minimal substitution schema/scaffolding only. Advanced runtime evaluation may be deferred.

## 3.18 Intelligence Engine - ADR-028

Recommendation buckets:
- Ready Now
- Ready With Substitution
- One or Two Items Away

Modes:
- Balanced
- Reduce Waste
- Save Money
- Fast Dinner
- Household Harmony

Top 5 recommendations shown by default, expandable list available.

All recommendations require short explanations.

Phase 1 requires basic recipe feasibility buckets. Advanced learning, scoring, snooze/decay, goal-mode optimization, and personalization may be deferred.

## 3.19 Household Engine - ADR-029

Shelf Esteem is household-first, person-aware.

Entities:
- Household
- HouseholdMember
- UserAccount

Important:
UserAccount is not the same as HouseholdMember.

MVP:
- one household
- multiple members
- one login

Schema must support future:
- multiple UserAccounts per Household
- multiple Households per UserAccount

Therefore UserAccount-to-Household must be many-to-many from day one, even if MVP UI only creates one account per household.

HouseholdMember may exist without UserAccount.

## 3.20 Household Restrictions and Preferences

Allergies and dietary restrictions are hard constraints.

Default rule:
- strictest restriction wins for whole-household meal recommendations

Preferences are soft scoring signals:
- likes boost score
- dislikes reduce score
- explicit hard dislikes may suppress recommendations

Individual/subset meal planning may allow foods not suitable for every household member.

## 3.21 Price Intelligence Engine

### Phase A
Basic price history.

Track:
- item name
- canonical item
- store
- date
- package size
- unit price
- discounts

### Phase B
- store comparison
- Price Scout Mode
- historical comparisons

### Phase C
- sale prediction
- shrinkflation
- price cycle intelligence

ReceiptItem is raw source data. PriceHistory is normalized/derived price observation data.

## 3.22 Hardware Integration Layer

Future support:
- USB barcode scanners
- thermal label printers

Hardware support must not require changes to core logic.

Input sources:
- camera
- USB scanner
- manual entry

All feed same intake pipeline.

---

# SECTION 4 - ADR LIBRARY

## Legacy ADRs

### ADR-001 - Recipe Sub-Object Storage
Recipe metadata such as timing, cost, nutrition, and quality stored as recipe columns, not child tables.

### ADR-002 - Controlled Vocabulary as Canonical Entities
Finite vocabularies become canonical tables. Free text remains text arrays.

### ADR-003 - Three-Tier Identity System
Major entities use integer PK, UUID v4, and slug.

### ADR-004 - Canonical Seed Table Strategy
Seed migrations are source of truth for canonical seed data. Database becomes authoritative once seeded.

### ADR-005 - Equipment as Canonical Entity
Equipment exists as canonical entities with alternative mappings.

### ADR-006 - Workflow Tags as Sixth Canonical Entity
Workflow tags separated from cooking methods.

### ADR-007 - Existing Schema Reconciliation
Legacy schema reconciliation approach. Superseded/amended by ADR-031 where pantry/event migration conflicts exist.

### ADR-008 - Pantry Tracking Mode & Inventory Confidence
Supports precise, confidence, and presence tracking. Foundation for pantry trust.

### ADR-023 - Recipe Entity Taxonomy & Canonical Inclusion Rules
Defines recipe types and canonical inclusion rules.

Recipe types:
- finished_item
- technique
- base

Usage roles:
- entree
- side
- snack
- component
- dessert
- drink

No sauce usage role. Sauce belongs in category, not usage role.

## Canon v2 ADRs

### ADR-024 - Inventory Event Model
Adds Acquire, Consume, Transform, Discard, Reconcile.

Events are immutable and append-only.

`pantry_items` is a synchronous projection/cache.

`pantry_deducted` is deprecated as canonical truth.

Idempotency keys and atomic transactions required.

### ADR-025 - Checkout Dual Truth
Inventory truth and financial truth are separate.

Inventory commit is separate and atomic.

Receipt processing is separate/asynchronous and cannot corrupt pantry.

### ADR-026 - Freshness and Utility Engine
Multi-strategy freshness with frozen modifier/transition.

Basic freshness schema required in Phase 1.

Advanced intelligence deferred.

### ADR-027 - Substitution Engine
Substitution rules live in canonical ingredients.

Household overrides canon.

Minimal schema now, advanced runtime later.

### ADR-028 - Recommendation Intelligence Engine
Three recommendation buckets, five goal modes, top 5 recommendations, short explanations.

Phase 1 scaffolding only.

### ADR-029 - Household Profile Architecture
Household, HouseholdMember, and UserAccount are separate.

UserAccount-to-Household many-to-many from day one.

### ADR-030 - Monetization and Pricing Architecture
Hybrid model: freemium subscription, premium intelligence, future hardware, future B2B.

Pricing must be configuration-driven, never hardcoded.

### ADR-031 - Legacy Schema to Event Model Migration
ADR-031 is added in v2.0.

Purpose:
Bridge older pantry schema and ADR-007 reconciliation rules into the ADR-024 event-sourced pantry model.

Rules:
- legacy pantry rows must be backfilled into event history
- existing pantry state becomes synthetic Acquire or Reconcile events
- no legacy mutable state may bypass event logging after migration
- migration must be staged, reversible where possible, and verified by rebuild tests
- `pantry_items` after migration is projection/cache only

ADR-031 is mandatory before Tier 1 migrations.

---

# SECTION 5 - DATA MODEL

## 5.1 Identity Entities

### Household
Top-level shared unit.

Represents:
- shared pantry
- planning
- shopping context
- goals

### UserAccount
App login identity.

Tracks:
- auth
- permissions
- billing

### HouseholdMember
Person food decisions are made for.

Tracks:
- name
- nickname
- age group
- preferences
- dislikes
- allergies
- dietary restrictions
- behavior patterns

### UserHouseholdMembership
Join table from day one.

Supports:
- many UserAccounts per Household
- many Households per UserAccount
- role/permissions per household

MVP may only create one membership, but schema must support many-to-many now.

## 5.2 Pantry Entities

### PantryItem
Current-state projection/cache.

Fields:
- household
- canonical ingredient
- display name
- quantity
- unit
- tracking mode
- confidence level
- is_present
- freshness strategy
- storage location
- acquisition date
- opened date
- expiration date
- last confirmed date
- current status

Rules:
- not canonical truth
- rebuildable from events
- synchronously updated with events

### PantryEvent
Canonical inventory history.

Fields:
- event_id
- household_id
- pantry_item_id nullable when event creates item
- leftover_id nullable
- event_type
- quantity_delta
- unit
- source
- idempotency_key
- created_by_user_account_id nullable
- affected_household_member_id nullable
- reason_code nullable
- metadata json
- created_at

Event types:
- acquire
- consume
- transform
- discard
- reconcile

Events are immutable.

### Event Metadata Requirements

Acquire:
- source_type
- checkout_session_id nullable
- receipt_item_id nullable
- migration_batch_id nullable

Consume:
- source_type
- recipe_id nullable
- cook_session_id nullable
- leftover_id nullable
- manual_reason nullable

Transform:
- source_item_ids
- target_item_ids
- recipe_id nullable
- leftover_source_id nullable
- storage_transition nullable

Discard:
- reason_code
- missed_opportunity_id nullable
- return_or_refund_reference nullable

Reconcile:
- prior_state_snapshot
- corrected_state_snapshot
- reason_code
- actor
- notes

## 5.3 Recipe Entities

### Recipe
Canonical recipe.

Fields:
- uuid
- slug
- title
- recipeType
- category
- usageRoles
- servings
- prep time
- cook time
- ingredients
- instructions
- leftover behavior
- freezer support
- aliases
- tags

recipeType:
- finished_item
- technique
- base

### RecipeIngredient
Ingredient requirement.

Supports:
- scaling
- substitutions
- pantry matching

## 5.4 Planning Entities

### WeeklyPlan
Planning period.

Tracks:
- household
- start date
- end date
- goal mode

### PlannedMeal
Meal slot.

Meal types:
- breakfast
- lunch
- dinner
- snack
- leftovers

## 5.5 Shopping Entities

### ShoppingList
Active household list.

### ShoppingListItem
Individual shopping entry.

States:
- pending
- in cart
- substituted
- skipped
- purchased

### CheckoutSession
Frozen cart before pantry mutation.

States:
- open
- reviewed
- committed
- failed

Commit must be atomic.

## 5.6 Receipt / Financial Entities

### Receipt
Purchase proof. Financial truth only.

### ReceiptItem
Raw line item.

### ReceiptCodeMap
Maps retailer-specific receipt codes to canonical ingredients.

Statuses:
- pending
- confirmed
- rejected

Raw receipt data must be preserved.

### PriceHistory
Normalized price observation.

Relationship:
ReceiptItem is raw source. PriceHistory is normalized/derived.

## 5.7 Leftover Entities

### Leftover
First-class leftover record.

Fields:
- source recipe
- parent_leftover_id nullable
- name
- servings remaining
- storage location
- created date
- expiration date
- frozen date nullable
- cost per serving
- label_printed_at nullable

`servings_remaining` is projection/cache.

Partial consumption creates Consume events.

Splitting leftovers creates Transform events.

Discard creates MissedOpportunity.

### MissedOpportunity
Tracks wasted leftovers.

## 5.8 Intelligence Entities

### Recommendation
Generated recommendation.

Types:
- cook
- use soon
- freeze
- buy
- discard
- substitute

### GoalProfile
Optimization preference.

Modes:
- Balanced
- Reduce Waste
- Save Money
- Fast Dinner
- Household Harmony

Phase 1 may implement only Balanced plus basic buckets.

## 5.9 Canonical Knowledge Entities

Includes:
- canonical ingredients
- canonical equipment
- canonical stores
- freshness rules
- substitution rules
- utility states

## 5.10 Substitution Schema

Minimal Phase 1 schema must support:
- canonical ingredient being replaced
- substitute ingredient(s)
- strength tier
- household override
- recipe override
- multi-ingredient substitution group

Runtime evaluation may be deferred.

---

# SECTION 6 - UX FLOWS

## 6.1 Core Workflow

Primary household loop:

Pantry -> Plan Meals -> Generate Shopping List -> Shop -> Checkout -> Update Pantry

All major flows reinforce this cycle.

## 6.2 Progressive Onboarding

Onboarding must not block first value.

Minimum to start:
- household name
- household size

Later/progressive:
- household members
- allergies
- preferences
- goals
- pantry enrichment

Goal setup default:
Balanced.

## 6.3 Pantry Bootstrap

Bootstrap methods:
- barcode scan
- manual entry
- smart bootstrap
- reconcile later

Smart Bootstrap definition:
A guided starter pantry checklist of common household staples, categories, and likely pantry items. It creates low-confidence or presence-based pantry entries, not precise inventory, unless the user confirms details.

If Smart Bootstrap is not ready for Phase 1, barcode/manual intake must remain the primary MVP path.

Reconcile Later must have a follow-up trigger, such as Kitchen Pulse prompt or setup task.

## 6.4 Pantry Intake Flow

Three intake sources:
- camera scan
- USB scanner
- manual entry

All use same handler.

Barcode flow target:
under 10 seconds from scan to confirmed pantry entry where possible.

## 6.5 Kitchen Pulse

Daily dashboard.

Sections:
- Immediate Attention
- Best Meal Recommendations
- Smart Shopping
- Waste Prevention Wins
- Household Insights

To avoid overload:
- Immediate Attention and Best Meal Recommendations are daily
- Waste Prevention Wins and Household Insights may be periodic/conditional rather than fully rendered every day

## 6.6 Meal Planning Flow

Planning starts from pantry truth.

Buckets:
- Ready Now
- Ready With Substitution
- One or Two Items Away

Missing ingredients do not automatically disqualify recipes.

If browse-all-recipes exists, pantry match percentage or readiness status must be visible.

## 6.7 Shopping Mode

Purpose:
Efficient in-store execution.

Supports:
- shopping list checkoff
- substitutions
- barcode scanning

Price Scout is Phase B, not Phase 1.

## 6.8 Price Scout Mode

Deferred to Price Intelligence Phase B.

When implemented:
- temporary mode inside Shopping Mode
- scan item
- resolve product
- cents-first price entry
- confirm
- return to shopping
- target under 15 seconds

## 6.9 Checkout Flow

Step 1: Review cart
Step 2: Commit inventory truth
Step 3: Optional receipt prompt

Receipt prompt should be concise, with optional expanded explanation.

Receipt-only items prompt user before pantry add.

## 6.10 Cooking Flow

Recipe execution creates idempotent Consume/Transform events.

One cook-session ID controls duplicate prevention.

## 6.11 Leftover Flow

After cooking:
Prompt whether leftovers exist.

Track:
- servings
- storage location
- use-by date

Label printing is deferred to Phase 6.

## 6.12 Notifications

Allowed:
- Kitchen Pulse
- critical spoilage alerts

Disabled by default:
- shopping reminders
- engagement nudges
- habit spam

---

# SECTION 7 - INTELLIGENCE RULES

## 7.1 Purpose

Convert pantry truth, household state, freshness data, shopping context, and goals into actionable recommendations.

## 7.2 Intelligence Modes

Passive:
- Kitchen Pulse
- at-risk foods
- duplicate prevention

Active:
- user asks what to cook
- cheapest meal
- fast meal
- household-safe meal

Active queries use same pantry-truth engine, not separate logic.

## 7.3 Recommendation Categories

- Cook
- Use Soon
- Freeze
- Buy
- Don't Buy
- Discard
- Substitute

## 7.4 Recipe Buckets

- Ready Now
- Ready With Substitution
- One or Two Items Away

Phase 1 must support at least Ready Now. Ready With Substitution may depend on substitution scaffolding.

## 7.5 Recommendation Volume

Default:
Top 5, expandable list.

Must be configurable later.

## 7.6 Goal Modes

- Balanced
- Reduce Waste
- Save Money
- Fast Dinner
- Household Harmony

Phase 1 may use Balanced only or minimal weighting.

## 7.7 Scoring Factors

- freshness urgency
- pantry availability
- cost savings
- waste prevention value
- household preference
- time fit
- confidence score
- historical success
- substitution strength

## 7.8 Learning Behavior

Deferred beyond Phase 1.

When implemented:
- positive signals boost
- soft negatives decay slightly
- hard negatives reduce strongly
- ignore does not equal dislike
- repeated snoozes should extend suppression

Future learning should include explore/exploit balance to avoid recommendation lock-in.

## 7.9 Explainability

All surfaced recommendations must include a short why.

No raw scoring exposed by default.

## 7.10 Intelligence Boundary

Shelf Esteem advises. The household decides.

---

# SECTION 8 - MONETIZATION

## 8.1 Philosophy

Shelf Esteem monetizes premium intelligence and convenience, not basic pantry ownership.

Users pay for advanced value, not the right to track food.

Avoid:
- pantry caps
- hard paywalls on core pantry visibility
- artificial friction

## 8.2 Hybrid Revenue Model

Revenue sources:
- consumer subscription
- hardware revenue
- future B2B licensing
- optional future affiliate revenue

## 8.3 Free Tier

Includes:
- pantry tracking
- basic meal planning
- shopping lists
- barcode scanning
- leftovers
- Kitchen Pulse
- core freshness warnings

## 8.4 Premium Tier - Stocked

Unlocks:
- full intelligence engine
- advanced recommendation modes
- price intelligence B/C
- store comparison
- sale prediction
- waste analytics
- household insights
- premium reports
- hardware integration

## 8.5 Pricing Architecture

Subscription pricing must be configuration-driven, never hardcoded.

Pricing and feature entitlements must be separable.

## 8.6 Initial Pricing Targets

Suggested:
- Monthly: $9.99
- Annual: $79-$89

Canon defines architecture, not permanent price.

## 8.7 Hardware Revenue

Future:
Shelf Esteem Starter Kit.

Possible contents:
- USB scanner
- thermal label printer
- setup guide
- premium trial

Hardware is optional.

## 8.8 B2B Licensing

Future opportunities:
- grocery chains
- meal services
- nutrition programs
- insurers
- enterprise wellness

## 8.9 Affiliate Revenue

Optional future.

Rule:
Affiliate incentives must never bias recommendations.

## 8.10 Validation Risk

Free tier may deliver much of the core promise. Premium conversion must be validated.

Most tangible premium hook likely:
- multi-store price comparison
- savings analytics
- advanced household intelligence

---

# SECTION 9 - ROADMAP

## 9.1 Current State

Architecture is coherent but v2.0 RC2 is released after stress-test changes.

Verdict from stress test:
APPROVE WITH CHANGES.

Canon v2.0 RC2 incorporates those required changes.

## 9.2 Phase 1 - Core Implementation

Phase 1 is split into sub-phases.

### Phase 1a - Minimal End-to-End Loop

Goal:
Get the full core loop working with reduced feature depth.

Must include:
- working auth
- household/user scaffolding
- pantry add manual
- pantry add barcode if feasible
- event log with projection cache
- basic freshness fields
- small recipe set (50-100 foundational recipes)
- basic meal planner with Ready Now
- basic shopping list
- checkout inventory truth
- basic leftovers

### Phase 1b - Full Phase 1 Foundation

Adds:
- larger recipe database target
- receipt capture/financial truth
- recipe import pipeline
- demo mode
- richer planner fixes
- seed tables
- expanded intake flows

Original 500 recipe target moves to Phase 1b unless schema is already stable and import cost is low.

## 9.3 Tier 0 - Required Before Code

Resolve/confirm:
- SHELFY naming
- pantry events as truth
- `pantry_items` projection/cache
- `pantry_deducted` deprecation
- Reconcile event
- idempotency keys
- atomic transactions
- UserAccount-Household many-to-many
- Price Scout deferred to Phase B
- basic freshness schema required

## 9.4 Tier 1 - Foundation

1. ADR-031 migration bridge
2. Inventory Event Model
3. Pantry projection/cache
4. Checkout Dual Truth
5. Household architecture
6. Basic freshness schema
7. migrations
8. canonical seed tables

## 9.5 Tier 2 - Bug Resolution

Order:
1. Auth
2. Pantry add flow
3. Barcode scan
4. Demo mode
5. Meal planner fixes

## 9.6 Tier 3 - Content

Recipe DB integration.

Start smaller if needed:
- 50-100 recipes for Phase 1a
- ~500 foundational recipes for Phase 1b/full launch

## 9.7 Phase 2 - Functional MVP

Goal:
Complete testable household workflow.

Includes:
- pantry bootstrap
- Plan My Week
- checkout + receipt flow
- leftovers
- Kitchen Pulse

## 9.8 Phase 3 - Intelligence Expansion

Add:
- Price Intelligence Phase B
- better ranking
- better personalization
- learning improvements
- substitution runtime

## 9.9 Phase 4 - Household Expansion

Multi-login households using already-present many-to-many schema.

## 9.10 Phase 5 - Mobile and Integrations

Future:
- iOS
- Android
- retailer integrations
- digital receipts
- live pricing
- order import

## 9.11 Phase 6 - Hardware Ecosystem

Includes:
- Starter Kit
- scanner workflows
- label printing
- freezer workflows
- leftover QR flows

## 9.12 Phase 7 - Enterprise Expansion

Potential:
- grocery intelligence licensing
- nutrition planning
- institutional waste analytics

## 9.13 Future Research

Possible:
- predictive spoilage
- better OCR
- basket optimization
- family behavior modeling
- optional AI voice assistant
- smart appliance integration

## 9.14 Final Product Vision

Shelf Esteem becomes the operating system for household food intelligence.

End-state intelligence:
- knows what you own
- knows what is expiring
- knows what your household likes
- knows what things cost
- helps you make better decisions daily

Goal:
Eliminate duplicate buying, reduce waste, lower grocery costs, and remove kitchen decision fatigue.

---

# SECTION 10 - IMPLEMENTATION GOVERNANCE FOR CLAUDE CODE

## 10.1 Claude Code Role

Claude Code implements, audits, and reports.

Claude Code must not casually redesign canon.

## 10.2 Required Audit Before Major Code

Before migrations or large refactors, Claude Code must return:
- codebase audit
- canon match/conflict report
- risk report
- recommended ticket order

## 10.3 Migration Safety

Prefer:
- additive migrations
- staged deprecation
- compatibility layers
- reversible steps where possible

Avoid:
- destructive rewrites
- silent direct state mutations
- schema changes that block future multi-login

## 10.4 Pantry Mutation Rule

All pantry mutation paths must write inventory events.

This includes:
- UI
- admin tools
- scripts
- migrations
- support tools

No direct writes to projection state without events.

## 10.5 Required Phase 1 Acceptance Tests

Before Phase 1 foundation is accepted:

1. Pantry can be rebuilt from events.
2. `pantry_items` projection matches event replay.
3. Duplicate cook-session request does not double-deduct.
4. Checkout commit is atomic.
5. Receipt processing failure does not roll back inventory truth.
6. Legacy pantry rows migrate into synthetic Acquire/Reconcile events.
7. Multi-login schema can represent more than one account per household.
8. Frozen leftover receives different freshness handling than fridge leftover.
9. Leftover partial consumption decrements via events.
10. Phase 1 does not require Price Scout.

## 10.6 Product Owner Authority

Final architectural authority belongs to:

Mike Schimmelmann
Founder / Product Owner
Shelf Esteem

Canon may only be superseded by explicit product-owner approval.

---

# CHANGELOG v2.0 RC2

Major changes from v1.0 RC1:
- Corrected mascot name from Shelfie to SHELFY.
- Added Reconcile as 5th inventory event type.
- Declared inventory events immutable and append-only.
- Defined pantry_items as synchronous projection/cache.
- Deprecated pantry_deducted as canonical truth.
- Added idempotency key requirement.
- Added atomic transaction requirement for inventory mutations.
- Separated inventory truth and financial truth transactions.
- Added partial leftover consumption event rules.
- Added leftover splitting model.
- Added frozen-item freshness transition/modifier.
- Required UserAccount-Household many-to-many schema from day one.
- Added ADR-031 legacy schema to event model migration.
- Moved Price Scout to Phase B.
- Defined Phase 1a and Phase 1b.
- Clarified basic scaffolding for freshness, substitutions, and intelligence.
- Added Claude Code implementation governance and acceptance tests.


---

# SECTION 11 - RC2 DOCUMENT-LEVEL BUILD CLARIFICATIONS

This section resolves the 10 document-level ambiguities identified after RC1 review. These are not feature additions. They are implementation-blocking clarifications so Claude Code can build Phase 1a without inventing missing rules.

If any earlier section conflicts with Section 11, Section 11 wins until the relevant section is formally rewritten in a later final canon.

## 11.1 Canonical PantryEvent reason_code Values

Valid `reason_code` values are:

- spoiled
- expired
- user_correction
- migration_backfill
- returned_to_store
- admin_repair
- duplicate_entry
- quantity_adjustment
- location_change
- freshness_override
- damaged
- unknown

No pantry event writer may invent new reason strings without canon update.

## 11.2 Idempotency Key Specification

Idempotency exists to prevent duplicate inventory mutation, especially from retries, double taps, network issues, and repeated recipe execution.

Rules:
- Server owns canonical idempotency validation.
- Format: UUID v4.
- Client may send a request/session key, but server validates and stores the canonical idempotency record.
- Uniqueness scope: household_id + action_type + idempotency_key.
- Same key with same payload returns existing result or no-op success.
- Same key with different payload must be rejected and logged as an idempotency conflict.

## 11.3 ADR-030 Standalone Requirement

ADR-030 is formal canon and must exist as a standalone ADR file.

ADR-030 covers:
- hybrid monetization
- premium intelligence
- hardware revenue
- future B2B
- pricing configuration rule

The ADR may summarize Section 8 but must exist as a separate file in the ADR library.

## 11.4 Smart Bootstrap Phase Placement

Smart Bootstrap is deferred from Phase 1a.

Phase 1a pantry intake scope:
- manual entry required
- barcode entry if feasible

Smart Bootstrap belongs to Phase 1b or later.

## 11.5 Leftover Splitting Phase Placement

Leftover splitting is deferred from Phase 1a.

Phase 1a supports:
- leftover creation
- partial leftover consumption
- leftover discard

Splitting one leftover into multiple containers is Phase 1b or later.

## 11.6 Phase 1a Recommendation Bucket Scope

Phase 1a must support:

- Ready Now

Phase 1a does not require:
- Ready With Substitution
- One or Two Items Away

Ready With Substitution begins after substitution scaffolding is usable. One or Two Items Away may follow after basic shopping gap logic is stable.

## 11.7 Cooking Transaction Boundary

Recipe execution is one atomic transaction when leftovers are created.

The transaction includes:
- ingredient Consume events
- Transform events
- Leftover entity creation
- PantryItem projection/cache updates
- Leftover projection/cache updates

All commit together or all roll back.

## 11.8 Reconcile Event Attribution

Every Reconcile event must include metadata fields:

- source_type
- actor_type

Examples:
- source_type = migration, actor_type = system
- source_type = manual_correction, actor_type = user
- source_type = admin_repair, actor_type = admin

This distinguishes migration-generated Reconcile events from human corrections without requiring a new event type.

## 11.9 GoalProfile Ownership

For Phase 1, GoalProfile is household-level.

Rules:
- one active GoalProfile per Household
- member-level goals are future
- member preferences, dislikes, allergies, and restrictions remain member-level

## 11.10 Attribution for Household Members Without UserAccount

The two nullable event attribution fields are sufficient.

Rules:
- created_by_user_account_id = the logged-in account that performed the action
- affected_household_member_id = the household member the action concerns

Example:
A parent records that a child dislikes broccoli:
- created_by_user_account_id = parent account
- affected_household_member_id = child HouseholdMember

A HouseholdMember does not need a UserAccount to have preferences, restrictions, dislikes, or behavior history recorded.

---

# CHANGELOG v2.0 RC2

Changes from v2.0 RC1:
- Added canonical PantryEvent reason_code values.
- Added idempotency key generation, format, scope, and collision handling.
- Required ADR-030 as standalone ADR file.
- Deferred Smart Bootstrap from Phase 1a to Phase 1b or later.
- Deferred leftover splitting from Phase 1a to Phase 1b or later.
- Locked Phase 1a recommendation scope to Ready Now only.
- Clarified atomic transaction boundary for recipe cooking with leftovers.
- Required source_type and actor_type metadata on Reconcile events.
- Locked GoalProfile ownership to Household-level for Phase 1.
- Clarified action attribution for HouseholdMembers without UserAccounts.
