# Flow

1. Engines compute their canonical read model.
2. A reduced `sourceContext` snapshot is persisted alongside the read model.
3. Replay reads the reduced snapshot, not live upstream state.
4. User-facing APIs expose only safe, reduced fields or hide the snapshot entirely.
