# Contract

## Canonical Ordering

The platform should converge on:

1. `date DESC`
2. `createdAt DESC`
3. `_id DESC` as a final deterministic tiebreaker

## Affected Read Models

- `RecoverySnapshot`
- `AdaptiveTrainingRecommendation`
- `CoachDecision`
- `GoalProgressSnapshot`
- `GoalForecast`

## Semantics

- `current` means the most relevant record for the active user state.
- `latest` means the most recent persisted daily record under the canonical ordering.
- history reads must preserve the same ordering contract.

