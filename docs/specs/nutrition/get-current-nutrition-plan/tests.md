# Tests

## Unit Tests

- returns active plan.
- returns not found when user profile is missing.
- returns not found when no active plan exists.
- does not call plan creation logic.

## Controller Tests

- uses authenticated user id.
- maps errors to HTTP status.
- returns safe payload.

## Acceptance Criteria

- only the owner can access the plan.
- replaced plans are not returned.
- macro target snapshot is returned as stored.
