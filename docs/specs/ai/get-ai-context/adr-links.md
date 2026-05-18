# ADR Links — Get AI Context

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-ai-context`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Centralized User Health Context

Decision:

```txt
Aggregate training, recovery, progress and nutrition signals in one context builder
```

Impact:

- reduz duplicação entre fluxos internos
- cria uma fonte única de contexto para o módulo `ai`

### ADR-002 — Authenticated User-Scoped Context Read

Decision:

```txt
Resolve authUserId from session
Return context only for the authenticated user
```

Impact:

- evita acesso cruzado entre usuários
- mantém o endpoint consistente com o restante do módulo `ai`

### ADR-003 — Safe Partial Context Fallback

Decision:

```txt
Missing optional data should degrade safely instead of failing
```

Impact:

- `nutritionProfile` pode estar ausente
- `latestCheckIn` pode estar ausente
- `fatigueLevel` continua disponível com fallback seguro

---

## 3. Summary

As decisões principais que impactam `get-ai-context` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- agregação centralizada do contexto de saúde
- leitura autenticada e isolada por usuário
- fallback parcial seguro
