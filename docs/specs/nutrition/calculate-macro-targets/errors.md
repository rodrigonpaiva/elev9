# Errors

## 1. Error Codes

```txt
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
FITNESS_PROFILE_NOT_FOUND
NUTRITION_PROFILE_NOT_FOUND
MACRO_TARGETS_INSUFFICIENT_DATA
MACRO_TARGETS_INTERNAL_ERROR
```

## 2. Error Details

### AUTH_INVALID_SESSION

The authenticated user could not be resolved.

### USER_PROFILE_NOT_FOUND

No `UserProfile` exists for the authenticated user.

### FITNESS_PROFILE_NOT_FOUND

No active `FitnessProfile` exists.

### NUTRITION_PROFILE_NOT_FOUND

No active `NutritionProfile` exists.

### MACRO_TARGETS_INSUFFICIENT_DATA

Required numeric body metrics are absent or invalid.

### MACRO_TARGETS_INTERNAL_ERROR

Unexpected repository or calculation failure.

## 3. HTTP Mapping

```txt
AUTH_INVALID_SESSION -> 401
USER_PROFILE_NOT_FOUND -> 404
FITNESS_PROFILE_NOT_FOUND -> 404
NUTRITION_PROFILE_NOT_FOUND -> 404
MACRO_TARGETS_INSUFFICIENT_DATA -> 422
MACRO_TARGETS_INTERNAL_ERROR -> 500
```
