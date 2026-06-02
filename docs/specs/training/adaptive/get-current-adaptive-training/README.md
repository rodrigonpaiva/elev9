# Get Current Adaptive Training

## 1. Overview

This spec defines the authenticated read model for the latest adaptive training recommendation.

```txt
Bounded Context: Training
Module: training
Use-case: get-current-adaptive-training
Canonical name: training.adaptive.get-current
```

## 2. Goal

Return the latest persisted adaptive training recommendation for the user.

## 3. MVP Scope

Included:

- latest recommendation read
- idempotent build fallback when current is missing
- safe authenticated access

Not included:

- plan rewriting
- LLM reasoning
- historical reconciliation

