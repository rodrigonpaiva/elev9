# Errors — Get Home Dashboard Debug

## 1. Overview

Este documento lista os erros possíveis do use-case `get-home-dashboard-debug`.

---

## 2. Error Codes

### AUTH_INVALID_SESSION

Significado:

- a sessão não é válida
- o `authUserId` não pôde ser resolvido com segurança

### USER_PROFILE_NOT_FOUND

Significado:

- não existe `UserProfile` para o `authUserId`

### DASHBOARD_INTERNAL_ERROR

Significado:

- ocorreu uma falha inesperada ao montar o snapshot

---

## 3. HTTP Mapping

- `AUTH_INVALID_SESSION` -> `401`
- `USER_PROFILE_NOT_FOUND` -> `404`
- `DASHBOARD_INTERNAL_ERROR` -> `500`

---

## 4. Error Rules

- o endpoint é interno e autenticado
- erros devem ser estáveis e previsíveis
- o payload de erro não deve expor dados sensíveis
