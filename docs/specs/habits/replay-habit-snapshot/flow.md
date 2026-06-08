# Flow

1. Resolve the authenticated user.
2. Resolve the user profile.
3. Load the persisted habit snapshot by id.
4. Verify ownership.
5. Recalculate deterministically using persisted source context only.
6. Compare persisted vs recalculated fields with the shared replay comparator.
7. Return the replay result without mutating persistence.
