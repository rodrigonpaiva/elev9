# ADR Links — Replay Coach Feedback

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `replay-coach-feedback`.

---

## 2. Related ADRs

### Official ADRs In Repository

- [ADR-002 — Recovery & Adaptive Coaching System](../../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../../adr/adr-003-coach-feedback-explainability.md)

### ADR-001 — Replay Uses Persisted Snapshot

Decision:

```txt
Replay uses persisted contextSnapshot instead of rebuilding live context
```

Impact:

- replay permanece determinístico
- replay não depende de mudanças recentes no contexto do usuário

### ADR-002 — Replay Reuses Real Generator

Decision:

```txt
Reuse CoachFeedbackGenerator instead of duplicating logic
```

Impact:

- reduz divergência entre geração e replay
- mantém o fluxo simples e consistente

### ADR-003 — Replay Compatibility Is Version-Gated

Decision:

```txt
Only supported generatorVersion values can be replayed
```

Impact:

- falha segura para versões desconhecidas
- evita replay incorreto com heurísticas incompatíveis

---

## 3. Summary

As decisões principais que impactam `replay-coach-feedback` são:

- ADR-002 recovery system
- ADR-003 explainability and replay system
- replay baseado em snapshot persistido
- reuso do generator real
- compatibilidade controlada por `generatorVersion`
