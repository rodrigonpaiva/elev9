# Build Personalization Snapshot

## Overview

Builds the canonical daily `PersonalizationSnapshot` for the authenticated user.

```txt
Bounded Context: personalization
Module: personalization
Use-case: build-personalization-snapshot
Canonical name: personalization.personalization-snapshot.build
```

## Goal

Turn upstream read models from recovery, training, goals, coach decisions, notifications, and habits into a deterministic daily personalization snapshot.

## Scope

- derive adaptation signals from persisted read models
- maintain reduced source context
- remain replayable and explainable
- avoid ownership of upstream business logic
