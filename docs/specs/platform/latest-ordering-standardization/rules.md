# Rules

- `date` is the primary logical order.
- `createdAt` is the secondary physical order.
- `_id` is only a tiebreaker.
- no engine should define “latest” in a way that contradicts its history order.
- if backfill introduces historical records, the ordering contract must remain deterministic.
