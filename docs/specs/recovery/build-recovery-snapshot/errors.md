## Errors

- `INVALID_SESSION`
- `USER_PROFILE_NOT_FOUND`
- `FITNESS_PROFILE_NOT_FOUND`
- `NUTRITION_PROFILE_NOT_FOUND`
- `TRAINING_PLAN_NOT_FOUND`
- `INTERNAL_ERROR`

### Notes

The builder should prefer safe fallback behavior over hard failure whenever a missing signal is not essential for the current calculation.

