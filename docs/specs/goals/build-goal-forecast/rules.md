# Rules

## Forecast inputs

- recent slope
- consistency
- adherence
- trend
- amount of history
- variance
- signal quality

## Forecast rules

- stronger positive slope shortens the completion estimate
- stable history increases confidence
- noisy or sparse history lowers confidence
- missing data should not fail the build
- forecast version must be recorded

## Confidence

- `low`
- `medium`
- `high`

## General rules

- deterministic-only
- no LLM
- no raw signal exposure
- one forecast per goal in MVP
