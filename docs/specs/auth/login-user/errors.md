# Errors — Login User

## 1. Overview

Este documento define os erros possíveis do use-case `login-user`.

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
AUTH_INVALID_CREDENTIALS
AUTH_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AUTH_INVALID_INPUT

Usado quando o input é inválido.

Causas comuns:

- `email` ausente
- `email` inválido
- `password` ausente
- `password` vazia

Mensagem segura:

```txt
Invalid input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 AUTH_INVALID_CREDENTIALS

Usado quando as credenciais informadas não são válidas.

Causas comuns:

- usuário não encontrado
- senha incorreta

Mensagem segura:

```txt
Invalid credentials.
```

HTTP status:

```txt
401 Unauthorized
```

### 4.3 AUTH_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no banco
- falha na comparação de senha
- erro ao gerar JWT
- erro inesperado no servidor

Mensagem segura:

```txt
An unexpected error occurred.
```

HTTP status:

```txt
500 Internal Server Error
```

Nota:

erro de token expirado não pertence a `login-user`.

Esse cenário pertence ao futuro use-case:

```txt
auth/validate-session
```

---

## 5. Security Rules

### 5.1 Never expose internal details

Não retornar:

- stack trace
- query do banco
- erro bruto do Mongoose
- detalhes do bcrypt
- detalhes do JWT

### 5.2 Invalid credentials message

Para o MVP, é obrigatório retornar:

```txt
Invalid credentials.
```

Essa mensagem deve ser a mesma para e-mail inexistente e senha incorreta.

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_INPUT       -> 400 -> Invalid input.
AUTH_INVALID_CREDENTIALS -> 401 -> Invalid credentials.
AUTH_INTERNAL_ERROR      -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

O sistema deve falhar de forma segura e impedir enumeração de contas por mensagens de erro.
