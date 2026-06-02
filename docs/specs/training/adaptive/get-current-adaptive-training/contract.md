# Contract

## Objective

Return the latest `AdaptiveTrainingRecommendation` for the authenticated user.

## REST Contract

```txt
GET /training/adaptive/current
```

## Output

```ts
{
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
}
```

## Domain Contract

- authenticated only
- isolated by `userProfileId`
- if no current recommendation exists, the system may build one deterministically

