# Contract - Get Notification History

## Objective

Return notification history for the authenticated user.

## Input

- authenticated `authUserId`
- optional `limit`

## Output

```ts
{
  notificationDecisions: NotificationDecision[];
}
```

## REST Contract

```txt
GET /notifications/history?limit=
```
