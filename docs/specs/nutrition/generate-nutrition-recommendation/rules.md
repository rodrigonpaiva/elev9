# Rules

## Inputs

- Recommendation must be based on structured context only.
- Required context includes nutrition profile and today nutrition.

## Influences

Influences should be stable strings such as:

```txt
goal:fat_loss
goal:muscle_gain
adherence:low
adherence:good
training:today
training:intensity_high
recovery:high_fatigue
nutrition:protein_low
nutrition:meals_skipped
```

## Generator Version

- Initial generator version: `nutrition-heuristic-v1`.
- Any behavior-changing rule update should bump the version.

## Safety

- Do not make medical claims.
- Do not diagnose deficiencies.
- Do not recommend extreme restriction.
- Keep recommendations short and actionable.

## Determinism

- No randomness.
- No LLM dependency.
- Same snapshot produces same recommendation.
