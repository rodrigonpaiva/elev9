# Contract - Get Current Coach Decision

## Objective

Return the latest `CoachDecision` for the authenticated user.

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
GET /ai/coach-decision/current
```

If no decision exists yet, the implementation may build the current daily decision internally and return it.

## Domain Contract

- resolve `UserProfile`
- load latest decision
- if missing, build the decision safely

