# Contract

## Input

- authenticated user context or `authUserId`
- optional replay/debug input for historical rebuilds

## Output

```ts
{
  personalizationSnapshot: PersonalizationSnapshot;
}
```

## Canonical Read Model

`PersonalizationSnapshot` is the daily source of truth for deterministic personalization.
