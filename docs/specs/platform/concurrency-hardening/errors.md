# Errors

Expected failure modes:

- duplicate-key races
- partially written daily records
- retry loops that generate inconsistent state
- non-idempotent builders

