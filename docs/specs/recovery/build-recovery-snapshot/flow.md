## Flow

### Main Flow

1. Resolve `UserProfile` from the authenticated session.
2. Resolve active `FitnessProfile`.
3. Resolve active `NutritionProfile`.
4. Resolve active `TrainingPlan`.
5. Load the latest `DailyCheckIn` and recent `WorkoutLog` records.
6. Load previous `RecoverySnapshot` records for trend comparison.
7. Compute `readinessScore`.
8. Compute `fatigueScore`.
9. Compute `recoveryTrend`.
10. Map `recommendedIntensity`.
11. Build `influences` and `sourceContext`.
12. Persist the new daily snapshot.
13. Return the persisted snapshot.

### Alternate Flows

- If check-in data is missing, compute from training and adherence signals only.
- If training data is missing, fall back to check-in and adherence signals.
- If no previous snapshot exists, default the trend to `stable`.

