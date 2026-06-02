# Rules

## Progress

- `actual` macro values come from logs.
- `remaining` cannot be less than zero unless explicitly documented later.
- `percent` is rounded to whole percent.
- `adherenceScore` is deterministic and based on meal status plus macro completion.

## Next Meal

- The first planned meal without a corresponding consumed or skipped log is the next meal.
- Replaced meals are treated as planned meals after replacement.

## Nutrition Focus

- Low logs or skipped meals -> `consistency`.
- High fatigue or poor recovery signals -> `recovery`.
- Training day with good adherence -> `performance`.

## Isolation

- The use case must not accept user ids from the client.
