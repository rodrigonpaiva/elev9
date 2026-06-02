# Flow

## Main Flow

1. Validate the authenticated user.
2. Resolve the `UserProfile`.
3. Resolve the active `TrainingPlan`.
4. Load recent `WorkoutLog` data.
5. Load recent `DailyCheckIn` data.
6. Load the latest `RecoverySnapshot`.
7. Load nutrition context.
8. Calculate readiness, fatigue, volume pressure, and support signals.
9. Select `recommendedIntensity`, `volumeAction`, and `recommendationType`.
10. Generate a short reasoning string and influences.
11. Persist the recommendation for the day.
12. Return the persisted read model.

## Alternative Flows

- If no `TrainingPlan` exists, return a clear error.
- If recovery is missing, use conservative fallback thresholds.
- If nutrition context is missing, treat nutrition support as neutral.
- If the same day is rebuilt, upsert the existing recommendation.

