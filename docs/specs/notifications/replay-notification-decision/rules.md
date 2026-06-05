# Rules - Replay Notification Decision

- Replay must not mutate persisted data.
- Replay must not call external delivery providers.
- Replay must use deterministic formula only.
- Comparison must ignore volatile fields unless explicitly selected.
