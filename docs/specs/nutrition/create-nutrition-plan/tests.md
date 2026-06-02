# Tests

## Unit Tests

- generates seven nutrition days.
- respects `mealsPerDay`.
- always excludes allergies.
- always respects dietary restrictions.
- avoids disliked foods when alternatives exist.
- prefers preferred foods when safe.
- snapshots macro targets into the plan.
- returns conflict when active plan exists.
- replaces active plan when requested.

## Repository Tests

- creates active nutrition plan.
- finds active plan by user profile id.
- enforces one active plan per user profile.
- marks existing plan as replaced.

## Controller Tests

- uses authenticated user only.
- maps errors correctly.
- returns safe payload.

## Acceptance Criteria

- deterministic output for same inputs.
- persisted plan can feed current-plan and today-nutrition specs.
- generated meals do not violate safety constraints.
