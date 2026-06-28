# Replay Habit Snapshot

## Overview

Replays a persisted habit snapshot using its reduced source context and deterministic formula.

```txt
Bounded Context: habits
Module: habits
Use-case: replay-habit-snapshot
Canonical name: habits.habit-snapshot.replay
```

## Goal

Provide a replay/debug surface for habit determinism without mutating persisted data.
