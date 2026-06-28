# Build Adaptive Training Recommendation

## 1. Overview

This spec defines the deterministic builder for adaptive training recommendations.

```txt
Bounded Context: Training
Module: training
Use-case: build-adaptive-training-recommendation
Canonical name: training.adaptive.build-recommendation
```

## 2. Goal

Build a single daily `AdaptiveTrainingRecommendation` from training, progress, recovery, and nutrition signals.

## 3. MVP Scope

Included:

- deterministic intensity calculation
- deterministic volume action calculation
- recommendation type selection
- influence generation
- persisted recommendation creation

Not included:

- LLM reasoning
- rewriting persisted training plans
- medical advice
- automated workout scheduling changes
