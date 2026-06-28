# Flow

1. Persist the canonical read model for a given day.
2. Store the formula version used to produce it.
3. Replay re-runs the calculator against the persisted reduced context.
4. Compare persisted and recalculated outputs.
5. If historical rebuilds are needed, they must be treated as versioned events, not silent overwrites.
