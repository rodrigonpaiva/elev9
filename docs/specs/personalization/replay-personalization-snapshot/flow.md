1. Resolve the authenticated user.
2. Resolve the user profile.
3. Load the persisted personalization snapshot by id.
4. Validate ownership.
5. Rebuild the snapshot from persisted reduced `sourceContext` only.
6. Compare persisted and recalculated deterministic fields.
7. Return the replay result without mutating persistence.
