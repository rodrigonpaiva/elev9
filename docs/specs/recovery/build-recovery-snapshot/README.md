# Build Recovery Snapshot

## 1. Overview

This spec defines the deterministic recovery snapshot builder for the recovery bounded context.

```txt
Bounded Context: Recovery
Module: recovery
Use-case: build-recovery-snapshot
Canonical name: recovery.build-recovery-snapshot
```

## 2. Goal

Build a single daily `RecoverySnapshot` from existing user, training, progress, and check-in signals.

## 3. MVP Scope

Included:

- deterministic readiness calculation
- deterministic fatigue calculation
- trend calculation from recent snapshots
- recommended intensity mapping
- influence generation
- persisted snapshot creation

Not included:

- LLM reasoning
- biometric devices
- medical advice
- adaptive training plan mutation
