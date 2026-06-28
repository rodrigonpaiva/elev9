# Get Today Recovery

## 1. Overview

This spec defines the authenticated "today" recovery read use case.

```txt
Bounded Context: Recovery
Module: recovery
Use-case: get-today-recovery
Canonical name: recovery.get-today-recovery
```

## 2. Goal

Expose the recovery snapshot for the current date and make the current day state easy to consume by dashboard, AI context, and future adaptive training.

## 3. MVP Scope

Included:

- authenticated read
- today's snapshot lookup
- deterministic build on first access when required
- stable day-level response

Not included:

- user-editable recovery state
- wearable ingestion
- LLM generation
