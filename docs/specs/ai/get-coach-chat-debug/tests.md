# Tests

## Required Coverage

- authenticated access
- aggregated response structure
- reuse of existing debug use-cases
- sanitized output
- memory preview aggregation
- recent messages truncation
- no persistence side effects
- no public payload changes
- no sensitive data leakage

## Expected Behaviors

- empty history remains safe
- fallback reply-path is represented explicitly
- prompt preview stays summarized
- memory preview stays summarized and inspection-only
