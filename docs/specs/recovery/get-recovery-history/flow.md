## Flow

1. Resolve `authUserId`.
2. Resolve `UserProfile`.
3. Normalize `limit`.
4. Fetch recovery snapshots for the user.
5. Sort descending by `date` and `createdAt`.
6. Return the first `limit` entries.
