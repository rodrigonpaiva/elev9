# Flow — Template

## 1. Overview

Este documento descreve o fluxo do use-case `<use-case-name>`.

---

## 2. Main Flow

```txt
1. Receive input
2. Validate input
3. Execute business logic
4. Persist data if needed
5. Return safe output
```

---

## 3. Detailed Flow

### Step 1 — Receive Input

Explique o input esperado.

### Step 2 — Validate Input

Explique validações relevantes.

### Step 3 — Execute Business Logic

Explique a regra principal do caso de uso.

### Step 4 — Persist Data

Explique o que é salvo e em qual contexto.

### Step 5 — Return Safe Output

Explique o shape da resposta.

---

## 4. Alternative Flows

### 4.1 Invalid Input

- `<ERROR_CODE>`

### 4.2 Business Rule Failure

- `<ERROR_CODE>`

### 4.3 Persistence Error

- `<ERROR_CODE>`

---

## 5. Sequence Diagram

```txt
Actor
   ->
Controller
   ->
UseCase
   ->
Repository
   ->
Return Response
```

---

## 6. Important Decisions

- <decision 1>
- <decision 2>

---

## 7. Summary

Resuma o fluxo principal em uma linha.
