# Errors — Generate Coach Feedback

## 1. Overview

Este documento define os erros possíveis do use-case `generate-coach-feedback`.

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
AI_COACH_INVALID_INPUT
AUTH_INVALID_SESSION
USER_PROFILE_NOT_FOUND
FITNESS_PROFILE_NOT_FOUND
AI_COACH_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AI_COACH_INVALID_INPUT

Usado quando o cliente envia body com qualquer campo funcional ou extra.

Causas comuns:

- envio de `authUserId`
- envio de ids internos
- envio de qualquer campo não permitido

Mensagem segura:

```txt
Invalid input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 AUTH_INVALID_SESSION

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

### 4.3 USER_PROFILE_NOT_FOUND

Usado quando não existe `UserProfile` para o `authUserId` autenticado.

Mensagem segura:

```txt
User profile not found.
```

HTTP status:

```txt
404 Not Found
```

### 4.4 FITNESS_PROFILE_NOT_FOUND

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

### 4.5 AI_COACH_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no banco
- erro inesperado no agregador
- falha na camada determinística de geração

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
- prompt interno
- detalhes do banco
- detalhes internos de autenticação

### 5.2 Resolve only through session

O sistema não deve aceitar ids vindos do cliente para contornar o fluxo de autorização.

### 5.3 Ownership-safe read path

O endpoint não deve vazar existência de perfis, planos ou logs de outros usuários.

---

## 6. Error Mapping Table

```txt
AI_COACH_INVALID_INPUT   -> 400 -> Invalid input.
AUTH_INVALID_SESSION      -> 401 -> Invalid session.
USER_PROFILE_NOT_FOUND    -> 404 -> User profile not found.
FITNESS_PROFILE_NOT_FOUND -> 404 -> Fitness profile not found.
AI_COACH_INTERNAL_ERROR   -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura, preservando sessão, escopo do usuário e simplicidade do MVP determinístico.
