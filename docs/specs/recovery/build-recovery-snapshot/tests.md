## Tests

- builds a snapshot with complete data
- falls back when `DailyCheckIn` is missing
- falls back when `WorkoutLog` history is missing
- falls back when `NutritionProfile` is missing
- returns `stable` when history is insufficient
- computes `improving` from better recent history
- computes `declining` from worse recent history
- maps all intensity thresholds
- persists one snapshot per day
- records formula version and source context
