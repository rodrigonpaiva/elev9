# Tasks

## Implementation Tasks

- Add authenticated route `GET /ai/chat/debug/memory`.
- Reuse the existing conversation memory repository.
- Resolve the latest conversation for the authenticated user.
- Return only sanitized memory preview fields.

## Validation Tasks

- Verify user isolation.
- Verify no sensitive fields leak.
- Verify empty state remains safe.
- Verify public chat endpoints remain unchanged.
