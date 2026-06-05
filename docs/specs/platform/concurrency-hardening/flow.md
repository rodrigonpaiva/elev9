# Flow

1. A build use case computes the daily read model.
2. The repository performs an upsert keyed by user and day.
3. If a duplicate-key race happens, the repository re-reads the canonical record.
4. The caller receives the persisted result.

