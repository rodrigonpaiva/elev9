# Errors

Expected failure modes:

- inconsistent current/latest semantics across modules
- ambiguous results when two records share the same date
- replay drift when ordering is not deterministic

These are platform consistency problems, not user-facing business errors.
