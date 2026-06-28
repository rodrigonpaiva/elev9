# Rules

- `sourceContext` must stay reduced and purposeful.
- raw upstream context must not be persisted unless explicitly justified in a future ADR.
- no direct user-facing contract should depend on an unconstrained `sourceContext`.
- replay/debug may read `sourceContext`; product surfaces should not leak it casually.
