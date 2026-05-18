# Use Case — Get Coach Feedback Debug History

## 1. Overview

O use-case `get-coach-feedback-debug-history` retorna o histórico interno de `CoachFeedback` do usuário autenticado com metadados de explainability.

Este fluxo existe para debugging técnico e replay contextual. Ele não altera o payload público de histórico e não cria nenhuma mutação adicional no domínio `AI`.

---

## 2. Context

```txt
Bounded Context: AI
Module: ai
Use-case: get-coach-feedback-debug-history
Canonical name: ai.get-coach-feedback-debug-history
```

---

## 3. Goal

Permitir que um usuário autenticado leia seu histórico interno de `CoachFeedback` com:

- `influences`
- `generatorVersion`
- `contextSnapshot`

sem expor dados sensíveis e sem alterar o comportamento dos endpoints públicos.

---

## 4. MVP Scope

Incluído:

- proteger endpoint com sessão validada
- resolver `UserProfile` pelo `authUserId`
- buscar histórico por `userProfileId`
- aplicar `limit` opcional
- usar default `20`
- usar máximo `100`
- retornar `influences`
- retornar `generatorVersion`
- retornar `contextSnapshot`
- manter compatibilidade com documentos legados sem metadata

Não incluído:

- expor esse payload na API pública
- recalcular feedback
- persistir qualquer nova entidade
- analytics avançado
- observabilidade externa

---

## 5. Preconditions

- a requisição está autenticada
- existe `UserProfile` para o `authUserId`
- o histórico é lido apenas para o usuário autenticado

---

## 6. Postconditions

Após sucesso:

- nenhum `CoachFeedback` é alterado
- nenhum replay é executado
- o histórico interno é retornado em modo somente leitura

---

## 7. Related Entities

- `UserProfile`
- `CoachFeedback`

---

## 8. Related Specs

- `ai/generate-coach-feedback`
- `ai/get-coach-feedback-history`
- `ai/replay-coach-feedback`

---

## 9. Business Value

Este fluxo adiciona rastreabilidade técnica ao sistema de coaching sem aumentar a superfície pública da API.

Ele permite:

- debugging contextual
- inspeção de metadata interna
- validação de compatibilidade entre feedbacks antigos e novas heurísticas

---

## 10. Decision

Decisões fechadas para o fluxo atual:

- o endpoint é interno e autenticado
- o histórico continua isolado por `userProfileId`
- `limit` default = `20`
- `limit` máximo = `100`
- documentos antigos sem `influences`, `generatorVersion` ou `contextSnapshot` continuam válidos
- `influences` faz fallback para `[]`
- o fluxo não executa replay
- nenhuma IA externa é usada

---

## 11. Summary

O use-case deve priorizar:

- autenticação obrigatória
- isolamento por usuário
- retorno de metadata interna segura
- compatibilidade com documentos legados
- nenhuma mutação adicional
