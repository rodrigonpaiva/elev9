# Use Case — Login User

## 1. Overview

O use-case `login-user` autentica um usuário existente no Elev9 Coach usando `email + password`.

No MVP, este use-case pertence exclusivamente ao `Auth Context` e atua apenas sobre identidade de autenticação.

Ele não cria `UserProfile`, não acessa `Fitness`, `Nutrition` ou `AI`, e não implementa `refresh token`.

---

## 2. Context

```txt
Bounded Context: Auth
Module: auth
Use-case: login-user
Canonical name: auth.login-user
```

---

## 3. Goal

Permitir que um usuário já cadastrado faça login usando:

- e-mail
- senha

Em caso de sucesso, o sistema retorna um `accessToken JWT` e dados seguros do usuário.

---

## 4. MVP Scope

Incluído:

- validar input
- normalizar e-mail
- buscar `AuthUser` por e-mail normalizado
- comparar senha informada com `passwordHash` via `PasswordHasher`
- gerar `accessToken JWT`
- retornar resposta segura

Não incluído:

- `refresh token`
- criação de `UserProfile`
- leitura de `Fitness`, `Nutrition` ou `AI`
- login social
- MFA/2FA
- gestão avançada de sessões

---

## 5. Preconditions

- o usuário já possui um `AuthUser`
- o cliente envia `email` e `password`

---

## 6. Postconditions

Após sucesso:

- as credenciais são consideradas válidas
- um `accessToken JWT` é gerado
- o usuário recebe dados seguros de autenticação

Nenhum outro contexto é alterado.

---

## 7. Related Entities

- `AuthUser`

---

## 8. Related Specs

- [auth/register-user](../register-user/README.md)
- `auth/refresh-session`
- [auth/validate-session](../validate-session/README.md)

---

## 9. Business Value

Este use-case habilita o acesso do usuário ao produto após o cadastro.

Ele deve manter `Auth` simples, seguro e desacoplado do restante do domínio.

---

## 10. Decision

Decisões fechadas para o MVP:

- `login-user` usa `email + password`
- o e-mail é normalizado com `trim + lowercase`
- a senha é comparada com `bcrypt` via `PasswordHasher`
- o retorno inclui apenas `accessToken JWT` e dados seguros do usuário
- não há `refresh token` no MVP
- falha de autenticação sempre retorna `AUTH_INVALID_CREDENTIALS`

---

## 11. Summary

O use-case deve priorizar:

- segurança de autenticação
- erro genérico para credenciais inválidas
- resposta segura
- isolamento do contexto `Auth`
