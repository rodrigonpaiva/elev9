# Rules

- Must use the platform date service.
- Must not expose raw source context beyond the reduced snapshot.
- Must stay idempotent.
- Must not recalculate habit formulas in the controller.
- Must use canonical latest/current ordering when falling back to history reads.
