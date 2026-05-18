# Dashboard Specs Index

## 1. Overview

O bounded context `dashboard` do Elev9 Coach atualmente agrega a superfície adaptativa da home do produto.

Ele reúne leitura consolidada de:

- recovery
- nutrition guidance
- adaptive signals
- daily check-ins
- explainability snapshots

Este contexto funciona como a superfície adaptativa do sistema, combinando payload público e superfície interna de debug separada.

A documentação deste bounded context segue [Documentation Governance](../GOVERNANCE.md), que define as regras de navegação, placeholders e limites para superfícies internas de debug.

---

## 2. Architecture Overview

```txt
UserHealthContext
→ Recovery heuristics
→ Nutrition guidance
→ Dashboard adaptive signals
→ Public dashboard
→ Internal debug endpoint
```

Hoje, a arquitetura do dashboard se apoia principalmente em:

- `GET /dashboard/home`
- `GET /dashboard/home/debug`
- `BuildUserHealthContextService`
- sinais determinísticos de recovery e nutrition
- payloads reduzidos e seguros

---

## 3. Spec Index

## Public Dashboard

- [get-home-dashboard](./get-home-dashboard/README.md)

## Internal Debug & Explainability

- [get-home-dashboard-debug](./get-home-dashboard-debug/README.md)

---

## 4. Relationship With AI

O dashboard reutiliza o mesmo `UserHealthContext` que alimenta o módulo `ai`.

Na prática:

- o dashboard compartilha heurísticas determinísticas com a camada de AI contextual
- `recovery` e `nutrition guidance` seguem o mesmo espírito de explainability interna
- o endpoint de debug do dashboard alinha-se à arquitetura de explainability do sistema

Importante:

- o dashboard não implementa replay
- o dashboard não executa geração generativa
- o dashboard apenas expõe reasoning adaptativo reduzido e seguro

---

## 5. ADRs

- [ADR-002 — Recovery & Adaptive Coaching System](../../adr/adr-002-recovery-system.md)
- [ADR-003 — Coach Feedback Explainability & Replay System](../../adr/adr-003-coach-feedback-explainability.md)

---

## 6. Current Architecture Characteristics

O estado atual da arquitetura do dashboard pode ser resumido por:

- deterministic-first
- safe reduced payloads
- internal debug surfaces
- adaptive but non-generative logic
- no medical claims

Essas características descrevem o sistema atual e não devem ser lidas como uma plataforma de IA avançada.

---

## 7. Future Directions

Possíveis evoluções arquiteturais futuras, ainda não implementadas:

- dashboard replay
- evaluation engine
- analytics
- wearable integrations
- adaptive recommendation tuning

Esses itens devem ser tratados como roadmap técnico, não como comportamento atual do sistema.

---

## 8. Summary

`docs/specs/dashboard/README.md` organiza a navegação do bounded context `dashboard` e deixa explícita a separação entre o payload público da home e o endpoint interno de debug usado para explainability.
