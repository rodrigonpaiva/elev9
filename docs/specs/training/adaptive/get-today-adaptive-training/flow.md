# Flow

1. Validate session.
2. Resolve `UserProfile`.
3. Resolve today's date using the module's date helper.
4. Look up today's recommendation.
5. If present, return it.
6. If absent, build it deterministically and return the persisted result.
