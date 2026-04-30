# Errors — Get Home Dashboard

## 1. Overview

Este documento define os erros possíveis do use-case `get-home-dashboard`.

Todos os erros devem ser:

- previsíveis
- estáveis
- seguros
- fáceis de testar

---

## 2. Error Shape

```ts
type UseCaseError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```

---

## 3. Error Codes

```txt
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
DASHBOARD_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AUTH_INVALID_SESSION

Usado quando a sessão é inválida.

Causas comuns:

- token ausente
- token inválido
- token expirado

Mensagem segura:

```txt
Invalid session.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.2 USER_PROFILE_NOT_FOUND

Usado quando não existe `UserProfile` para o `authUserId` autenticado.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.3 DASHBOARD_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no banco
- erro inesperado no servidor

Mensagem segura:

```txt
An unexpected error occurred.
```

HTTP status:

```txt
500 Internal Server Error
```

---

## 5. Security Rules

### 5.1 Never expose internal details

Não retornar:

- stack trace
- detalhes do banco
- detalhes internos de autenticação

### 5.2 Partial data is not an error

Ausência de `FitnessProfile` ou `TrainingPlan` não deve ser tratada como erro no MVP.

Esse caso retorna sucesso com campos `null` ou resumo zerado.

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_SESSION   -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND -> 404 -> User profile not found.
DASHBOARD_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, mantendo separação entre sessão, perfil de usuário e agregação do dashboard.
