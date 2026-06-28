# Get Today Adaptive Training

## 1. Overview

This spec defines the day-scoped adaptive training read model.

```txt
Bounded Context: Training
Module: training
Use-case: get-today-adaptive-training
Canonical name: training.adaptive.get-today
```

## 2. Goal

Return today's adaptive training recommendation, building it deterministically when missing.

## 3. MVP Scope

Included:

- day-scoped recommendation read
- deterministic build fallback
- idempotent upsert behavior

Not included:

- rewriting the active training plan
- schedule mutation
- non-deterministic ranking
