# Contract - Get Coach Decision History

## Objective

Return the coach decision history for the authenticated user.

## Input

- authenticated `authUserId`
- optional `limit`

## Output

```ts
{
  coachDecisions: CoachDecision[];
}
```

## REST Contract

```txt
GET /ai/coach-decision/history?limit=
```

## Limit Rules

- default: `14`
- maximum: `90`
