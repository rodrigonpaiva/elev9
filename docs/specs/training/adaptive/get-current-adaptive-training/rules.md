# Rules

- Current means the latest persisted recommendation, not a recomputation from scratch.
- If missing, the endpoint may invoke the deterministic builder.
- The returned recommendation must belong to the authenticated user only.
