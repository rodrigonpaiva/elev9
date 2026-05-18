# Use Case — Replay Coach Feedback

## 1. Overview

O use-case `replay-coach-feedback` reexecuta on-demand o `CoachFeedbackGenerator` a partir de um `CoachFeedback` já persistido e do seu `contextSnapshot`.

Este fluxo existe para debugging e comparação determinística. Ele não persiste o replay e não altera o payload público de feedback.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: replay-coach-feedback
Canonical name: ai.replay-coach-feedback
```

---

## 3. Goal

Permitir que um usuário autenticado compare:

- o feedback persistido
- o feedback regenerado

usando o mesmo generator heurístico real e o snapshot de contexto persistido.

---

## 4. MVP Scope

Incluído:

- proteger endpoint com sessão validada
- resolver `UserProfile`
- carregar `CoachFeedback` por id
- validar ownership
- validar `contextSnapshot`
- validar `generatorVersion`
- reexecutar `CoachFeedbackGenerator`
- retornar `persisted`, `replayed` e `matches`

Não incluído:

- persistir replay
- suportar múltiplas versões de generator
- executar diff detalhado
- recalcular `UserHealthContext` completo

---

## 5. Preconditions

- a requisição está autenticada
- existe `UserProfile` para o `authUserId`
- existe `CoachFeedback` do usuário autenticado
- o documento possui `contextSnapshot`
- o documento possui `generatorVersion` suportado

---

## 6. Postconditions

Após sucesso:

- nenhum documento é alterado
- nenhum replay é persistido
- a comparação é retornada apenas on-demand

---

## 7. Related Entities

- `UserProfile`
- `CoachFeedback`

---

## 8. Related Specs

- [ai/generate-coach-feedback](../generate-coach-feedback/README.md)
- [ai/get-coach-feedback-debug-history](../get-coach-feedback-debug-history/README.md)
- [ai/get-coach-feedback-history](../get-coach-feedback-history/README.md)

---

## 9. Business Value

Este use-case adiciona replay determinístico e rastreabilidade técnica sem alterar a experiência pública do produto.

Ele permite:

- debugging contextual
- análise de regressão
- validação da heurística atual

---

## 10. Decision

Decisões fechadas para o fluxo atual:

- o endpoint é interno e autenticado
- replay reutiliza o `CoachFeedbackGenerator` real
- replay depende de `contextSnapshot`
- replay depende de `generatorVersion`
- somente `heuristic-v1` é suportado no estado atual
- replay é read-only
- replay não é persistido

---

## 11. Summary

O use-case deve priorizar:

- autenticação obrigatória
- isolamento por usuário
- replay determinístico
- ausência de mutação
- comparação simples entre `persisted` e `replayed`
