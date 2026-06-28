# Get Current Recovery

## 1. Overview

This spec defines the authenticated recovery read use case that returns the latest persisted snapshot for the user.

```txt
Bounded Context: Recovery
Module: recovery
Use-case: get-current-recovery
Canonical name: recovery.get-current-recovery
```

## 2. Goal

Expose the most recent recovery state as a stable read model.

## 3. MVP Scope

Included:

- authenticated read
- latest snapshot lookup
- safe not-found behavior
- stable contract for dashboard and AI

Not included:

- recomputation of history
- scheduling
- LLM usage
