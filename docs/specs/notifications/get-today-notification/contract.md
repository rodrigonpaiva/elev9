# Contract - Get Today Notification

## Objective

Return today's `NotificationDecision` for the authenticated user.

## Input

- authenticated `authUserId`

## Output

```ts
{
  notificationDecision: NotificationDecision;
}
```

## REST Contract

```txt
GET /notifications/today
```

If no decision exists yet, the implementation may build one internally and return it.
