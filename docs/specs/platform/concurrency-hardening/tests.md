# Tests

Future validation should cover:

- concurrent daily builds converge to one record
- duplicate-key fallback returns the persisted record
- retries do not create duplicate user/day rows
- idempotency holds across recovery, training, goals, and coach decision engines

