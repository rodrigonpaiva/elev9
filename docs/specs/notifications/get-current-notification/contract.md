# Contract - Get Current Notification

## Objective

Return the latest `NotificationDecision` for the authenticated user.

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
GET /notifications/current
```

If the current decision is missing, the implementation may build it internally and return it.
