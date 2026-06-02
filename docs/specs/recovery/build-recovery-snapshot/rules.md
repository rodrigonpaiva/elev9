## Rules

### Readiness Score

- Range: `0-100`
- Higher is better
- Deterministic initial formula weights:
  - `sleepQuality`: 30%
  - `energyLevel`: 25%
  - `muscleSoreness` inverse: 20%
  - `adherenceScore`: 15%
  - recent workout load inverse: 10%

### Fatigue Score

- Range: `0-100`
- Higher means more fatigue
- Deterministic initial formula weights:
  - recent workouts: 35%
  - muscle soreness: 30%
  - energy level inverse: 20%
  - check-in sleep inverse: 15%

### Recovery Trend

- Compare the current snapshot to recent snapshots for the same user.
- `improving` when readiness rises and fatigue falls meaningfully.
- `declining` when readiness falls and fatigue rises meaningfully.
- `stable` for mixed or insufficient signal.

### Recommended Intensity

- `0-39` -> `recovery`
- `40-59` -> `light`
- `60-79` -> `moderate`
- `80-100` -> `hard`

### Influence Examples

- `LOW_SLEEP`
- `LOW_ENERGY`
- `HIGH_MUSCLE_SORENESS`
- `HIGH_ADHERENCE`
- `LOW_ADHERENCE`
- `HIGH_WORKOUT_LOAD`
- `RECENT_WORKOUT_COMPLETION`
- `LONG_STREAK`
- `MISSED_WORKOUTS`

