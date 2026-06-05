# Flow

1. Daily snapshots are built against the current UTC date.
2. Read models are queried using the same UTC date boundary.
3. Replay and backfill must use the same date boundary that was active when the record was generated.
4. A future timezone-aware migration must provide a compatibility layer for older records.

