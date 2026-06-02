# Contract

## Objective

Produce a deterministic `AdaptiveTrainingRecommendation` for the authenticated user.

## Input

- authenticated `authUserId`
- optional `date`
- optional explicit source overrides for internal build/debug flows

## Output

```ts
{
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
}
```

## REST Contract

Internal MVP builder only:

```txt
POST /training/adaptive/build
```

The public read endpoints will consume the same use case internally when a recommendation for the day is missing.

## Domain Contract

The builder must:

- resolve the user profile
- resolve the active training plan
- gather recent workout logs
- gather recent daily check-ins
- read the latest recovery snapshot
- read the latest nutrition signals
- compute a deterministic recommendation
- persist it with idempotent daily upsert

