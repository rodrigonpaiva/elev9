# Errors — Validate Session

## 1. Overview

Este documento define os erros possíveis do use-case `validate-session`.

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
AUTH_INVALID_INPUT
AUTH_INVALID_SESSION
AUTH_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AUTH_INVALID_INPUT

Usado quando o input é inválido.

Causas comuns:

- header `Authorization` ausente
- header malformado
- formato diferente de `Bearer <token>`

Mensagem segura:

```txt
Invalid input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 AUTH_INVALID_SESSION

Usado quando a sessão não é válida.

Causas comuns:

- token ausente
- assinatura inválida
- token malformado
- token expirado
- token inválido

Mensagem segura:

```txt
Invalid session.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.3 AUTH_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no provider JWT
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
- detalhes do JWT
- payload completo do token

### 5.2 Invalid session message

Para o MVP, é obrigatório retornar:

```txt
Invalid session.
```

Essa mensagem deve ser a mesma para token ausente, inválido ou expirado.

Isso inclui obrigatoriamente:

- token ausente
- assinatura inválida
- token malformado
- token expirado

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_INPUT   -> 400 -> Invalid input.
AUTH_INVALID_SESSION -> 401 -> Invalid session.
AUTH_INTERNAL_ERROR  -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura e tratar qualquer sessão inválida com uma resposta genérica.
