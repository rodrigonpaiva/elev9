# Contract

## Input

- authenticated user context

## Output

```ts
{
  personalizationSnapshot: PersonalizationSnapshot;
}
```

## Canonical Read Model

`PersonalizationSnapshot` is resolved by the current UTC date partition.
