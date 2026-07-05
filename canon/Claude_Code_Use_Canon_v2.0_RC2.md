# CLAUDE CODE DIRECTIVE - USE CANON v2.0 RC2

Use Shelf_Esteem_Canon_v2.0_RC2_FULL.md as the current source of truth.

RC2 supersedes RC1.

Do not build from RC1 unless comparing historical changes.

Key RC2 build clarifications:
- Phase 1a recommendation bucket = Ready Now only.
- Smart Bootstrap is not Phase 1a.
- Leftover splitting is not Phase 1a.
- GoalProfile is household-level for Phase 1.
- PantryEvent reason_code enum is canonical.
- Server validates UUID v4 idempotency keys scoped by household_id + action_type + idempotency_key.
- Recipe execution with leftovers is one atomic transaction.
- Reconcile events require source_type and actor_type metadata.
- ADR-030 exists as standalone canon.
