# Errors — Get AI Context

## 1. Overview

Este documento define os erros relevantes do endpoint `get-ai-context`.

O endpoint atual não introduz uma camada própria de erro de domínio. A principal falha explícita no boundary HTTP é a autenticação.

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

---

## 5. Security Rules

### 5.1 Never expose internal details

Não retornar:

- stack trace
- detalhes internos de autenticação
- detalhes internos do banco

### 5.2 Missing optional data is not an error

Ausência de:

- `nutritionProfile`
- `latestCheckIn`
- `TrainingPlan`
- `FitnessProfile`

não deve ser tratada como erro deste endpoint.

---

## 6. Error Mapping Table

```txt
AUTH_INVALID_SESSION -> 401 -> Invalid session.
```

---

## 7. Summary

O endpoint deve falhar explicitamente apenas na camada de autenticação e degradar com segurança quando partes opcionais do contexto estiverem ausentes.
