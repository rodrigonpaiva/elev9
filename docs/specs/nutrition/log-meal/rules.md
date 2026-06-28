# Rules

- Valid statuses are `consumed`, `partial`, and `skipped`.
- `skipped` always contributes zero actual macros.
- `consumed` uses planned macros unless actual macros are provided.
- `partial` should require actual macros in MVP.
- A user cannot log another user's meal.
- One log should exist per meal per date.
- Logs belong to Nutrition module, not Progress module.
