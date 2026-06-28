# Flow - Get Today Coach Decision

1. Validate the authenticated session.
2. Resolve `UserProfile`.
3. Resolve today date using the shared date strategy.
4. Load the decision for today.
5. If missing, build and persist it.
6. Return the decision.
