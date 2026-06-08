# Tests

- builds with a full signal set
- builds with neutral fallbacks
- persists reduced source context only
- upserts daily snapshot
- uses current UTC date
- derives trend deterministically
- does not mutate persisted records during replay-style rebuilds
