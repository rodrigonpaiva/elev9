# ADR Links — Get Coach Feedback Debug History

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-coach-feedback-debug-history`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Internal Debug History Is Separate From Public History

Decision:

```txt
Keep debug metadata out of GET /ai/coach-feedback
Expose it only through GET /ai/debug/coach-feedback
```

Impact:

- o histórico público continua compatível
- `influences`, `generatorVersion` e `contextSnapshot` ficam restritos ao fluxo interno

### ADR-002 — Authenticated User-Scoped Debug Read

Decision:

```txt
Resolve authUserId from session
Read by userProfileId only
```

Impact:

- o fluxo mantém isolamento por usuário
- evita acesso a feedbacks internos de outros usuários

### ADR-003 — Backward-Compatible Explainability Metadata

Decision:

```txt
Legacy documents remain valid without metadata
```

Impact:

- `influences` pode ser `[]`
- `generatorVersion` e `contextSnapshot` podem estar ausentes

---

## 3. Summary

As decisões principais que impactam `get-coach-feedback-debug-history` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- separação explícita entre histórico público e histórico interno
- leitura autenticada e isolada por usuário
- compatibilidade com documentos legados
