# Errors — Register User

## 1. Overview

Este documento define os erros possíveis do use-case `register-user`.

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
AUTH_PASSWORD_TOO_WEAK
AUTH_EMAIL_ALREADY_EXISTS
AUTH_INTERNAL_ERROR
```

---

## 4. Error Definitions

### 4.1 AUTH_INVALID_INPUT

Usado quando o input é inválido.

Causas comuns:

- `name` ausente
- `name` curto ou longo demais
- `email` ausente
- `email` inválido
- `password` ausente

Mensagem segura:

```txt
Invalid input.
```

HTTP status:

```txt
400 Bad Request
```

### 4.2 AUTH_PASSWORD_TOO_WEAK

Usado quando a senha não atende aos critérios mínimos.

Causas comuns:

- menos de `8` caracteres
- sem letra maiúscula
- sem letra minúscula
- sem número

Mensagem segura:

```txt
Password does not meet security requirements.
```

HTTP status:

```txt
400 Bad Request
```

### 4.3 AUTH_EMAIL_ALREADY_EXISTS

Usado quando já existe `AuthUser` com o mesmo e-mail normalizado.

Também deve ser usado quando o MongoDB/Mongoose retornar erro de índice único para e-mail durante a persistência, inclusive em condição de corrida.

Mensagem segura:

```txt
Email already exists.
```

HTTP status:

```txt
409 Conflict
```

### 4.4 AUTH_INTERNAL_ERROR

Usado quando ocorre falha inesperada no fluxo.

Causas comuns:

- erro no banco
- falha ao gerar hash
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
- query do banco
- erro bruto do Mongoose
- detalhes internos do hash

### 5.2 Duplicate email message

Para o MVP, é aceitável retornar:

```txt
Email already exists.
```

No futuro, isso pode ser endurecido para evitar enumeração de contas.

### 5.3 Unique index translation

Erros de índice único do MongoDB/Mongoose para `email` não devem vazar detalhes do provider.

Eles devem ser traduzidos para:

```txt
AUTH_EMAIL_ALREADY_EXISTS
```

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_INPUT        -> 400 -> Invalid input.
AUTH_PASSWORD_TOO_WEAK    -> 400 -> Password does not meet security requirements.
AUTH_EMAIL_ALREADY_EXISTS -> 409 -> Email already exists.
AUTH_INTERNAL_ERROR       -> 500 -> An unexpected error occurred.
```

---

## 7. Summary

Os erros devem ser claros para cliente e frontend, mas sem comprometer segurança nem vazar detalhes internos.
