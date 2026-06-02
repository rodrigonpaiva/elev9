# Rules

## Deterministic Inputs

The builder must use:

- `RecoverySnapshot.recommendedIntensity`
- `readinessScore`
- `fatigueScore`
- `recoveryTrend`
- `adherence`
- `currentStreak`
- `missedWorkouts`
- recent workout load
- nutrition support signals

## Initial Thresholds

```txt
readiness >= 80 && fatigue <= 30 -> increase_intensity or increase_volume
readiness >= 60 && fatigue <= 50 -> maintain or moderate
readiness < 60 || fatigue > 60 -> decrease_intensity or decrease_volume
readiness < 40 || fatigue > 75 -> recovery_workout
readiness < 30 && fatigue > 85 -> rest_day
low adherence + no high fatigue -> reschedule_workout
```

## Recommendation Type Rules

- `increase_intensity` when readiness is high and recovery is stable or improving.
- `decrease_intensity` when fatigue is elevated or recovery is declining.
- `increase_volume` when readiness is high, fatigue is low, and adherence is strong.
- `decrease_volume` when recent load is high or streak/missed workouts indicate overload.
- `recovery_workout` when the user needs movement but not load.
- `rest_day` when both readiness and fatigue indicate overreaching risk.
- `reschedule_workout` when adherence is low but recovery is not the main blocker.
- `maintain` when signals are balanced.

## Influence Rules

Generate deterministic influences from the same signal set.

