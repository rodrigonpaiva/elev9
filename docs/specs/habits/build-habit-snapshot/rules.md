# Rules

- Use the platform date service for UTC daily partitioning.
- Do not query live AI prompts or external providers.
- Do not persist raw upstream payloads.
- Use only reduced source context.
- Compute trend from rolling snapshots, not from ad hoc runtime analysis.
- Favor deterministic first-match behavior when multiple signals compete.
- Keep the snapshot idempotent per user and date.
