# Contract

## Endpoint

`GET /ai/chat/debug/memory`

## Authentication

- `AuthSessionGuard`
- isolated by authenticated user

## Response

```ts
{
  memory?: {
    version: string;
    generatedFromMessageCount: number;
    summaryPreview: string;
    metadata: {
      hasRecoveryContext: boolean;
      hasNutritionContext: boolean;
      hasWorkoutContinuity: boolean;
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

## Notes

- `summaryPreview` is truncated and sanitized.
- The response is inspection-only and does not expose raw memory summaries, raw history or raw `UserHealthContext`.
