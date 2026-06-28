# Get Recovery History

## 1. Overview

This spec defines the authenticated recovery history read use case.

```txt
Bounded Context: Recovery
Module: recovery
Use-case: get-recovery-history
Canonical name: recovery.get-recovery-history
```

## 2. Goal

Expose a chronological history of recovery snapshots for debugging, dashboard history, and future adaptive training.

## 3. MVP Scope

Included:

- authenticated history read
- pagination by limit
- descending sort by date and creation time
- safe user isolation

Not included:

- filtering by trend
- LLM explanation
- aggregation across users
