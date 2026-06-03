# Contract - Get Today Coach Decision

## Objective

Return the daily `CoachDecision` for the authenticated user.

## Input

- authenticated `authUserId`

## Output

```ts
{
  coachDecision: CoachDecision;
}
```

## REST Contract

```txt
GET /ai/coach-decision/today
```

If the decision for today is missing, the implementation may build it internally and return the persisted result.

