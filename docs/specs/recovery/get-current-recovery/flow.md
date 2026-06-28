## Flow

1. Resolve `authUserId`.
2. Resolve `UserProfile`.
3. Look up the latest `RecoverySnapshot` for the user.
4. Return the snapshot if found.
5. Return a not-found error if the user has no snapshot yet.
