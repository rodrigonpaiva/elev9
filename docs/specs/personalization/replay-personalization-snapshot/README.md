# Replay Personalization Snapshot

## Overview

Replays a persisted `PersonalizationSnapshot` using its reduced `sourceContext`.

```txt
Bounded Context: personalization
Module: personalization
Use-case: replay-personalization-snapshot
Canonical name: personalization.personalization-snapshot.replay
```

## Goal

Provide deterministic inspection and drift detection without mutating persisted data.
