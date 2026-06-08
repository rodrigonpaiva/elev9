# Contract

## Input

- authenticated user context

## Output

```ts
{
  consistencySummary: ConsistencySummary;
}
```

## Behavior

The summary is derived from canonical habit snapshots and is not recalculated ad hoc by consumers.
