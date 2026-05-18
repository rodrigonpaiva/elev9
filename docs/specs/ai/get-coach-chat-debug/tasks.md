# Tasks

## Implementation Tasks

- Add authenticated route `GET /ai/chat/debug`.
- Reuse existing debug use-cases.
- Aggregate prompt, reply-path, and history snapshots.
- Return only sanitized fields.

## Validation Tasks

- Verify user isolation.
- Verify no sensitive fields leak.
- Verify recent message truncation.
- Verify public chat endpoints remain unchanged.
