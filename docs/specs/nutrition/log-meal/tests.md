# Tests

## Unit Tests

- logs consumed meal with planned macros.
- logs consumed meal with actual macro override.
- logs skipped meal with zero macros.
- rejects partial log without actual macros.
- rejects invalid status.
- rejects meal outside active plan.
- upserts existing log for same meal/date.

## Repository Tests

- creates nutrition log.
- finds logs by user and date.
- enforces unique meal/date log.

## Acceptance Criteria

- today nutrition progress updates from logs.
- logs remain isolated by user.
- skipped and partial states are reflected deterministically.
