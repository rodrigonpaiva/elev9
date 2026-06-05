# Contract - Build Notification Decision

## Objective

Return a persisted deterministic `NotificationDecision` for the authenticated user.

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
POST /notifications/build
```

The MVP may also build the decision internally when current/today reads need it.

## Domain Contract

- resolve `UserProfile`
- consume existing deterministic read models
- apply fatigue protection
- persist the decision idempotently
