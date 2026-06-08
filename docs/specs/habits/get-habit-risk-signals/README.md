# Get Habit Risk Signals

## Overview

Returns deterministic habit risk signals for the authenticated user.

```txt
Bounded Context: habits
Module: habits
Use-case: get-habit-risk-signals
Canonical name: habits.habit-risk-signal.get
```

## Goal

Expose streak-at-risk and dropout-risk signals without forcing downstream consumers to recalculate them.
