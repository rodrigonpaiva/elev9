# Rules

- idempotency is expected for all daily builders
- duplicate-key fallback is part of the platform contract
- snapshot generation must remain safe under concurrent retries
- no engine should rely on race-prone overwrite semantics
