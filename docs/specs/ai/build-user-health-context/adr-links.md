# ADR Links — Build User Health Context

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao componente `BuildUserHealthContextService`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Centralized Context Aggregation

Decision:

```txt
Aggregate health signals in one internal service
```

Impact:

- reduz duplicação de contexto entre fluxos do módulo `ai`
- cria uma base única para coach feedback, debug e replay

### ADR-002 — Deterministic Recovery Heuristics

Decision:

```txt
Calculate fatigueLevel with deterministic rules
```

Impact:

- previsibilidade
- testabilidade
- ausência de dependência em IA externa

### ADR-003 — Safe Partial Context

Decision:

```txt
Missing optional inputs should degrade safely
```

Impact:

- `nutritionProfile` pode estar ausente
- `latestCheckIn` pode estar ausente
- ausência de treino ativo não invalida o contexto

---

## 3. Summary

As decisões principais que impactam `build-user-health-context` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- agregação centralizada
- heurísticas determinísticas
- fallback parcial seguro
