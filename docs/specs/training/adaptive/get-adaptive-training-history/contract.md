# Contract

## Objective

Return a history of `AdaptiveTrainingRecommendation` entries for the authenticated user.

## REST Contract

```txt
GET /training/adaptive/history?limit=
```

## Output

```ts
{
  adaptiveTrainingRecommendations: AdaptiveTrainingRecommendation[];
}
```

## Limit Policy

- default: `14`
- maximum: `90`
- invalid values must return a consistent validation error
