# Flow - Get Coach Decision History

1. Validate the authenticated session.
2. Resolve `UserProfile`.
3. Validate the optional limit.
4. Load the history ordered from newest to oldest.
5. Return the capped list.

