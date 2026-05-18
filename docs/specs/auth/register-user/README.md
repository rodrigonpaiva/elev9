# Use Case — Register User

## 1. Overview

O use-case `register-user` cria uma nova conta de autenticação no Elev9 Coach.

No MVP, este use-case pertence exclusivamente ao `Auth Context` e cria apenas um `AuthUser`.

Ele não cria `UserProfile` e não executa nenhuma lógica de onboarding, fitness, nutrição ou IA.

---

## 2. Context

```txt
Bounded Context: Auth
Module: auth
Use-case: register-user
Canonical name: auth.register-user
```

---

## 3. Goal

Permitir que um usuário ainda não autenticado crie uma conta usando:

- nome
- e-mail
- senha

O nome é recebido no fluxo para compor a resposta inicial e suportar o onboarding seguinte, mas o contexto `Auth` continua dono apenas do `AuthUser`.

---

## 4. MVP Scope

Incluído:

- validar input
- normalizar e-mail
- verificar unicidade do e-mail
- gerar hash da senha
- criar `AuthUser`
- retornar resposta segura

Não incluído:

- criação de `UserProfile`
- login automático após cadastro
- envio de e-mail de verificação
- OAuth social login
- MFA/2FA

---

## 5. Preconditions

- o usuário não está autenticado
- o e-mail informado ainda não existe

---

## 6. Postconditions

Após sucesso:

- um `AuthUser` é criado
- a senha é persistida apenas como `passwordHash`
- o e-mail é salvo normalizado
- `isEmailVerified` inicia como `false`
- o usuário pode seguir para login e depois para `users/create-user-profile`

---

## 7. Related Entities

- `AuthUser`

---

## 8. Related Specs

- [auth/login-user](../login-user/README.md)
- [users/create-user-profile](../../users/create-user-profile/README.md)
- `auth/verify-email`

---

## 9. Business Value

Este use-case habilita a entrada do usuário no produto de forma segura e desacoplada.

Ele deve manter `Auth` simples e independente do restante do domínio.

---

## 10. Decision

Decisão fechada para o MVP:

`register-user` cria apenas `AuthUser`.

`UserProfile` será criado em `users/create-user-profile`.

---

## 11. Summary

O use-case deve priorizar:

- segurança da senha
- unicidade do e-mail
- resposta segura
- separação entre `Auth` e `Users`
