# Contract - Get Engagement Summary

## Objective

Return an engagement summary for the authenticated user.

## Input

- authenticated `authUserId`

## Output

```ts
{
  engagementSummary: {
    engagementScore: number;
  };
}
```

## REST Contract

```txt
GET /notifications/engagement-summary
```
