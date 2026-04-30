# Errors — Get Progress Summary

## 1. Overview

Este documento define os erros possíveis do use-case `get-progress-summary`.

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
FITNESS_PROFILE_NOT_FOUND
PROGRESS_SUMMARY_INVALID_INPUT
PROGRESS_SUMMARY_INTERNAL_ERROR
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

### 4.3 FITNESS_PROFILE_NOT_FOUND

Usado quando não existe `FitnessProfile` ativo para o `UserProfile` autenticado.

Também deve ser usado quando existir `FitnessProfile`, mas ele não estiver `active`.

Mensagem segura:

```txt
Fitness profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.4 PROGRESS_SUMMARY_INVALID_INPUT

Usado quando o input do resumo é inválido.

Causas comuns:

- `period` fora de `week | month`

Mensagem segura:

```txt
Invalid progress summary input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.5 PROGRESS_SUMMARY_INTERNAL_ERROR

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

### 5.2 Resolve only through session

O sistema não deve aceitar ids vindos do cliente para contornar o fluxo de autorização.

### 5.3 Ownership-safe aggregation

O resumo não deve vazar existência de logs, planos ou perfis de outros usuários.

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_SESSION         -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND       -> 404 -> User profile not found.
FITNESS_PROFILE_NOT_FOUND    -> 404 -> Fitness profile not found.
PROGRESS_SUMMARY_INVALID_INPUT -> 400 -> Invalid progress summary input.
PROGRESS_SUMMARY_INTERNAL_ERROR -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, mantendo separação entre sessão, perfis, treinos e agregação de progresso.
