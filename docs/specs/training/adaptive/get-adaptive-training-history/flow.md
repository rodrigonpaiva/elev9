# Flow

1. Validate session.
2. Resolve `UserProfile`.
3. Parse and validate the `limit` query parameter.
4. Fetch the recommendation history ordered by recency.
5. Apply the limit.
6. Return the bounded list.
