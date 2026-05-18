# Use Case — Validate Session

## 1. Overview

O use-case `validate-session` valida um `accessToken JWT` do usuário autenticado no Elev9 Coach.

No MVP, este use-case pertence exclusivamente ao `Auth Context` e valida apenas a sessão baseada em token de acesso.

Ele não cria `UserProfile`, não acessa `Fitness`, `Nutrition` ou `AI`, e não implementa `refresh token`.

---

## 2. Context

```txt
Bounded Context: Auth
Module: auth
Use-case: validate-session
Canonical name: auth.validate-session
```

---

## 3. Goal

Permitir que o backend valide um `accessToken JWT` recebido no header:

- `Authorization: Bearer <token>`

Em caso de sucesso, o sistema retorna dados seguros do usuário autenticado.

---

## 4. MVP Scope

Incluído:

- ler header `Authorization`
- extrair token no formato `Bearer`
- validar JWT via `AccessTokenVerifier`
- usar payload mínimo com `sub` e `email`
- retornar dados seguros do usuário autenticado

Não incluído:

- `refresh token`
- renovação automática de token
- leitura de `UserProfile`
- leitura de `Fitness`, `Nutrition` ou `AI`
- controle avançado de revogação de sessão

---

## 5. Preconditions

- a requisição traz um header `Authorization`
- o cliente envia um `accessToken JWT`

---

## 6. Postconditions

Após sucesso:

- o token é considerado válido
- o payload autenticado é aceito
- o sistema retorna dados seguros mínimos do usuário

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`

---

## 8. Related Specs

- [auth/login-user](../login-user/README.md)
- `auth/refresh-session`

---

## 9. Business Value

Este use-case habilita a proteção básica de endpoints autenticados no MVP.

Ele deve manter `Auth` simples, seguro e desacoplado do restante do domínio.

---

## 10. Decision

Decisões fechadas para o MVP:

- `validate-session` valida um `accessToken JWT`
- o token vem do header `Authorization: Bearer <token>`
- o payload mínimo contém `sub` e `email`
- falha por token ausente, inválido ou expirado retorna sempre `AUTH_INVALID_SESSION`
- não há `refresh token` no MVP

---

## 11. Summary

O use-case deve priorizar:

- validação segura de sessão
- erro genérico para sessão inválida
- resposta segura mínima
- isolamento do contexto `Auth`
