# Tests

## Unit Tests

- generates consistency recommendation for low adherence.
- generates recovery recommendation for high fatigue.
- generates performance recommendation for training day and good adherence.
- includes stable influences.
- includes generator version.
- builds reduced context snapshot.
- does not include sensitive fields.
- produces identical output from identical snapshot.

## Repository Tests

- persists recommendation history if repository is implemented.
- retrieves recent recommendations by user profile id.

## Controller Tests

- uses authenticated user.
- maps errors correctly.
- returns safe payload.

## Acceptance Criteria

- recommendation is deterministic.
- response includes `message`, `recommendations`, `influences`, `generatorVersion`, and `contextSnapshot`.
- fallback without LLM is the primary path.
