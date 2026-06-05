# Contract

## Current Behavior

The platform uses daily upserts with duplicate-key fallback for deterministic read models.

## Target Guarantees

- repeated builds for the same user/day should converge to one canonical record
- concurrent writes should not create user-visible duplicates
- retries should be safe

