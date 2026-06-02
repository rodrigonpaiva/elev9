## Rules

- Default `limit` should be safe and small, such as 20.
- `limit` must have an upper bound.
- History is read-only.
- The caller sees only its own data.
- The list should be stable across repeated reads.

