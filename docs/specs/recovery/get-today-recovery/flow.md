## Flow

1. Resolve `authUserId`.
2. Resolve `UserProfile`.
3. Compute today's date for the current timezone strategy.
4. Look up today's recovery snapshot.
5. If it exists, return it.
6. If it does not exist, build it deterministically.
7. Persist the result if required.
8. Return the snapshot for today.
