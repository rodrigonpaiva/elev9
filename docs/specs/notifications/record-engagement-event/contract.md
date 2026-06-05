# Contract - Record Engagement Event

## Objective

Record an engagement event for a notification decision.

## Input

```ts
{
  authUserId: string;
  notificationDecisionId?: string;
  type: EngagementEventType;
  metadata?: object;
}
```

## Output

```ts
{
  engagementEvent: EngagementEvent;
}
```

## REST Contract

```txt
POST /notifications/:id/events
```
