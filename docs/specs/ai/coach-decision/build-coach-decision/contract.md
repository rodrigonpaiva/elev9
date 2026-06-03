# Contract - Build Coach Decision

## Objective

Build a deterministic `CoachDecision` for the authenticated user.

## Input

- authenticated `authUserId`
- optional `date`
- optional internal debug overrides for replay/build flows

## Output

```ts
{
  coachDecision: CoachDecision;
}
```

## REST Contract

Internal MVP builder only:

```txt
POST /ai/coach-decision/build
```

The public read endpoints can invoke the same builder internally when the daily decision is missing.

## Domain Contract

The builder must:

- resolve the user profile
- gather the latest recovery snapshot
- gather the latest nutrition recommendation
- gather the latest adaptive training recommendation
- gather recent progress signals
- assemble a reduced source context
- select a deterministic priority
- generate a deterministic summary and action items
- persist the decision with idempotent daily upsert

