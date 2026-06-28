# Tests

## Unit Tests

- replaces a meal with a compatible alternative.
- preserves previous meal in history.
- stores replacement reason.
- stores `replacedAt`.
- rejects meals outside the authenticated user's plan.
- rejects alternatives with allergies.
- rejects alternatives violating restrictions.
- avoids disliked foods when possible.

## Repository Tests

- updates nested meal in active plan.
- persists replacement history.

## Acceptance Criteria

- replacement is deterministic.
- unsafe replacement cannot be persisted.
- user isolation is enforced.
