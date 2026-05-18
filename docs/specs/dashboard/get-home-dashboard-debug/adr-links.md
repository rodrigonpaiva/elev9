# ADR Links — Get Home Dashboard Debug

## 1. Overview

Este documento referencia as decisões arquiteturais relacionadas ao use-case `get-home-dashboard-debug`.

---

## 2. Related ADRs

### ADR-002 — Recovery & Adaptive Coaching System

Decision:

```txt
Recovery heuristics and adaptive coaching
```

Impact:

- o snapshot de debug reutiliza sinais de recovery já calculados no sistema
- a lógica adaptativa permanece deterministic-first

### ADR-003 — Coach Feedback Explainability & Replay System

Decision:

```txt
Explainability metadata, snapshots and replay
```

Impact:

- o dashboard debug segue a mesma lógica de explainability interna do AI
- o payload interno é reduzido, rastreável e separado da API pública

---

## 3. Summary

As decisões principais que impactam `get-home-dashboard-debug` são:

- recovery heuristics
- explainability interna
- payload reduzido e seguro
- separação entre debug e API pública
