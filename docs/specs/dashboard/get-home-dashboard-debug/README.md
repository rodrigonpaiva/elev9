# Use Case — Get Home Dashboard Debug

## 1. Overview

O use-case `get-home-dashboard-debug` expõe o snapshot adaptativo interno da home do dashboard.

Ele existe para explainability técnica e debugging contextual. O fluxo é separado do payload público de `get-home-dashboard` e não adiciona persistência, analytics ou replay.

---

## 2. Context

```txt
Bounded Context: Dashboard
Module: dashboard
Use-case: get-home-dashboard-debug
Canonical name: dashboard.get-home-dashboard-debug
```

---

## 3. Goal

Permitir que um usuário autenticado inspecione o reasoning adaptativo do dashboard com:

- `generatedAt`
- `recovery.fatigueLevel`
- `recovery.recoveryTrend`
- `recovery.recoverySignals`
- `nutrition.priority`
- `nutrition.signals`

sem expor dados sensíveis e sem alterar o payload público da home.

---

## 4. MVP Scope

Incluído:

- proteger endpoint com `AuthSessionGuard`
- resolver `UserProfile` pelo `authUserId`
- gerar snapshot adaptativo sob demanda
- retornar sinais determinísticos de recovery
- retornar sinais determinísticos de nutrition
- manter isolamento por usuário

Não incluído:

- persistir snapshot
- executar replay do dashboard
- analytics avançado
- health scoring clínico
- alterar o payload público de `get-home-dashboard`

---

## 5. Preconditions

- a requisição está autenticada
- existe `UserProfile` para o `authUserId`

---

## 6. Postconditions

Após sucesso:

- nenhum dado é alterado
- nenhum snapshot é persistido
- apenas o payload interno de debug é retornado

---

## 7. Related Entities

- `UserProfile`
- `DailyCheckIn`

---

## 8. Related Specs

- [dashboard/get-home-dashboard](../get-home-dashboard/README.md)
- [ai/build-user-health-context](../../ai/build-user-health-context/README.md)
- [ai/get-coach-feedback-debug-history](../../ai/get-coach-feedback-debug-history/README.md)
- [ai/replay-coach-feedback](../../ai/replay-coach-feedback/README.md)

---

## 9. Business Value

Este use-case separa a superfície pública do dashboard da camada interna de explainability.

Ele facilita:

- debugging técnico
- inspeção de sinais adaptativos
- consistência entre recovery, nutrition e dashboard

---

## 10. Decision

Decisões fechadas para o fluxo atual:

- o endpoint é interno e autenticado
- o snapshot é gerado on-demand
- o payload é reduzido e seguro
- `generatedAt` vem do contexto calculado
- `recoverySignals` e `nutrition.signals` são determinísticos
- o fluxo não persiste dados
- o fluxo não executa replay
- o fluxo não expõe tokens, email ou sessão

---

## 11. Summary

O use-case deve priorizar:

- isolamento por usuário
- explainability determinística
- payload interno reduzido
- separação clara entre API pública e debug interno
