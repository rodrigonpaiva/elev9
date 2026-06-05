# Flow - Replay Notification Decision

1. Resolve the authenticated user profile.
2. Load the persisted notification decision by id.
3. Verify ownership.
4. Recalculate the decision using the stored reduced source context.
5. Compare selected fields and report drift.
