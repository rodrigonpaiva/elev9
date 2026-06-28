# Contract

## Objective

Return the adaptive recommendation for the current day.

## REST Contract

```txt
GET /training/adaptive/today
```

## Output

```ts
{
  adaptiveTrainingRecommendation: AdaptiveTrainingRecommendation;
}
```

## Domain Contract

- authenticated only
- daily idempotent read/write behavior
- build when missing, then read the persisted snapshot
