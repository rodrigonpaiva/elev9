# Get Adaptive Training History

## 1. Overview

This spec defines the authenticated historical read model for adaptive training recommendations.

```txt
Bounded Context: Training
Module: training
Use-case: get-adaptive-training-history
Canonical name: training.adaptive.get-history
```

## 2. Goal

Return a bounded history of adaptive recommendations for the user.

## 3. MVP Scope

Included:

- historical read model
- default and maximum limit handling
- authenticated isolation

Not included:

- trend scoring
- graphing logic
- plan rewriting
