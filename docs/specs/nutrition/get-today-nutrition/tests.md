# Tests

## Unit Tests

- returns today's meals from active plan.
- returns zero progress when no logs exist.
- calculates progress from consumed logs.
- handles partial logs.
- handles skipped logs.
- resolves next meal.
- returns null next meal when all meals are logged.
- builds recovery focus when fatigue signal is high.

## Controller Tests

- uses authenticated user.
- maps missing plan and missing day.
- returns safe payload.

## Acceptance Criteria

- dashboard can consume the response.
- no state is changed.
- progress is deterministic and testable.
